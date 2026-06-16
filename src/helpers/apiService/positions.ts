import { get as _get } from 'lodash';
import {
  DELAY,
  delay,
  getCredentials,
  CREDENTIALS,
} from 'krb-smart-api-module';

import { get } from '../api';
import { logger } from '../logger';
import { notify } from '../notifier';
import {
  ALGO,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
  ME,
} from '../constants';
import { Position, ISmartApiData, CheckPosition } from '../../app.interface';
import {
  getAllOpenPositions,
  getOpenSellPositions,
  getOpenPositionsByExpiry,
} from '../functions';
import OrderStore from '../../store/orderStore';
import { getAuthHeaders, getSmartSession } from './session';
import { doOrder } from './orders';
import {
  isPaperMode,
  getPaperPositions,
  savePaperPositions,
} from '../paperTrade';

export const getPositions = async (
  _smartSession: ISmartApiData,
  _cred: CREDENTIALS,
): Promise<Position[]> => {
  if (isPaperMode()) {
    const paperPositions = getPaperPositions();
    // Update LTP for paper positions
    const { getLtpWithRetry } = await import('./marketData');
    for (const pos of paperPositions) {
      let retryAttempt = 0;
      const MAX_LTP_RETRIES = 3;
      let success = false;

      while (retryAttempt < MAX_LTP_RETRIES && !success) {
        try {
          const ltpData = await getLtpWithRetry({
            exchange: pos.exchange,
            symboltoken: pos.symboltoken,
            tradingsymbol: pos.tradingsymbol,
            maxRetries: 1, // We handle retries here with exponential backoff
          });

          if (ltpData && ltpData.ltp) {
            pos.ltp = ltpData.ltp.toString();
            const netQty = Number.parseInt(pos.netqty);
            const buyVal = Number.parseFloat(pos.totalbuyvalue);
            const sellVal = Number.parseFloat(pos.totalsellvalue);
            pos.unrealised = (sellVal - buyVal + netQty * ltpData.ltp).toFixed(
              2,
            );
            pos.pnl = (
              Number.parseFloat(pos.realised) +
              Number.parseFloat(pos.unrealised)
            ).toFixed(2);
            success = true;
          }
        } catch (e: any) {
          retryAttempt++;
          if (retryAttempt >= MAX_LTP_RETRIES) {
            logger.error(
              `[PAPER] Failed to update LTP for ${pos.tradingsymbol} after ${MAX_LTP_RETRIES} attempts`,
              e,
            );
          } else {
            const backoffDelay = 3000 * Math.pow(2, retryAttempt - 1);
            logger.warn(
              `[PAPER] Rate limit or error for ${pos.tradingsymbol}. Retrying in ${backoffDelay}ms (Attempt ${retryAttempt}/${MAX_LTP_RETRIES})`,
            );
            await delay({ milliSeconds: backoffDelay });
          }
        }
      }
      // Fixed small delay between different positions to stay under rate limits
      await delay({ milliSeconds: 350 });
    }
    savePaperPositions(paperPositions);
    return paperPositions;
  }

  const headers = await getAuthHeaders();

  try {
    const responseJson = await get(
      'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPositions',
      headers,
    );
    const positions = _get(responseJson, 'data', []) as Position[];

    if (Array.isArray(positions)) {
      logger.log(
        `${ALGO}: getPositions — Success. Total positions: ${positions.length}`,
      );
      return positions;
    }
    return [];
  } catch (error) {
    logger.error(`${ALGO}: getPositions failed:`, error);
    throw error;
  }
};

/**
 * Fetches the open positions.
 */
export const getPositionsJson = async (isAbrupt = false) => {
  try {
    const smartSession = await getSmartSession();
    const cred = getCredentials();
    await delay({ milliSeconds: DELAY });
    const positions: Position[] = await getPositions(smartSession, cred);
    const openPositions = isAbrupt
      ? getAllOpenPositions(positions)
      : getOpenSellPositions(positions);
    logger.log(`${ALGO}: Total open positions: ${openPositions.length}`);
    return openPositions;
  } catch (error) {
    logger.error(`${ALGO}: getPositionsJson failed:`, error);
    return [];
  }
};

/**
 * Fetches open positions filtered by index and expiry.
 */
export const fetchOpenPositionsByExpiry = async (
  index: string,
  expiryDate: string,
  type: 'ALL' | 'SELL' | 'BUY' = 'ALL',
): Promise<Position[]> => {
  try {
    const smartSession = await getSmartSession();
    const cred = getCredentials();
    await delay({ milliSeconds: DELAY });

    const allPositions: Position[] = await getPositions(smartSession, cred);
    if (!Array.isArray(allPositions) || allPositions.length === 0) return [];

    const filtered = getOpenPositionsByExpiry(
      allPositions,
      index,
      expiryDate,
      type,
    );
    return filtered;
  } catch (error) {
    logger.error(`${ALGO}: fetchOpenPositionsByExpiry failed:`, error);
    return [];
  }
};

/**
 * Closes a particular trade.
 */
export const closeParticularTrade = async ({ trade }: { trade: Position }) => {
  try {
    await delay({ milliSeconds: DELAY });
    const netQty = Number.parseInt(trade.netqty);
    const tradingsymbol = trade.tradingsymbol;
    const transactionType =
      netQty < 0 ? TRANSACTION_TYPE_BUY : TRANSACTION_TYPE_SELL;
    const symboltoken = trade.symboltoken;
    const lotSize = Number.parseInt(trade.lotsize);
    const transactionStatus = await doOrder({
      tradingsymbol,
      transactionType,
      symboltoken,
      lotSize,
      variety: 'NORMAL',
      ordertype: 'MARKET',
    });
    logger.log(
      `${ALGO}: closeParticularTrade — ${tradingsymbol}: ${transactionStatus.status}`,
    );
  } catch (error) {
    logger.error(`${ALGO}: closeParticularTrade failed:`, error);
    throw error;
  }
};

/**
 * Closes all open trades.
 */
export const closeAllTrades = async (isAbrupt = false) => {
  try {
    await delay({ milliSeconds: DELAY });
    const positions = await getPositionsJson(isAbrupt);

    if (!Array.isArray(positions) || positions.length === 0) return;

    // Import marketData at the start of the function, not inside the loop
    const { getLtpWithRetry } = await import('./marketData');

    for (const position of positions) {
      if (isAbrupt && Number.parseInt(position.netqty) !== 0) {
        await closeParticularTrade({ trade: position });
      } else if (!isAbrupt) {
        const ltpData = await getLtpWithRetry({
          exchange: position.exchange,
          tradingsymbol: position.tradingsymbol,
          symboltoken: position.symboltoken,
        });

        const isNetqtyNegative = Number.parseInt(position.netqty) < 0;
        const isLtpGreaterThanFive = ltpData && ltpData.ltp > 5;

        if (isNetqtyNegative && isLtpGreaterThanFive) {
          await closeParticularTrade({ trade: position });
        }
      }
    }
  } catch (error) {
    logger.error(`${ALGO}: closeAllTrades failed:`, error);
    throw error;
  }
};

/**
 * Calculates the Mark-to-Market (MTM) for the traded positions.
 */
export const getMtm = async (positions?: Position[]) => {
  let tradedPositions: Position[] = [];
  if (positions) {
    tradedPositions = positions;
  } else {
    const smartSession = await getSmartSession();
    const cred = getCredentials();
    await delay({ milliSeconds: DELAY });
    tradedPositions = await getPositions(smartSession, cred);
  }
  const tradedExpiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  const tradedIndex = OrderStore.getInstance().getPostData().INDEX;
  let mtm = 0;
  if (tradedPositions !== null && Array.isArray(tradedPositions)) {
    for (const position of tradedPositions) {
      const isSameExpiryDate = position.expirydate === tradedExpiryDate;
      const isSameIndex = position.symbolname === tradedIndex;
      if (isSameExpiryDate && isSameIndex) {
        const unrealised = Number.parseFloat(position.unrealised);
        const realised = Number.parseFloat(position.realised);
        mtm += unrealised + realised;
      }
    }
  }
  return mtm;
};

/**
 * Ensures all trades are closed and records the trade.
 */
export const closeTrade = async (isAbrupt = false) => {
  logger.log(`${ME}: Checking if all trades are closed.`);
  let retries = 0;
  const MAX_RETRIES = 5;

  while (retries < MAX_RETRIES) {
    const openPositions = await getPositionsJson(isAbrupt);
    if (openPositions.length === 0) break;

    logger.log(
      `${ALGO}: Active trades found (${openPositions.length}). Executing close (Attempt ${retries + 1}/${MAX_RETRIES})...`,
    );
    await closeAllTrades(isAbrupt);
    retries++;

    if (retries === MAX_RETRIES) {
      logger.error(
        `${ALGO}: closeTrade — Failed to close all positions after ${MAX_RETRIES} attempts.`,
      );
      await notify(
        `CRITICAL: Failed to close all trades after ${MAX_RETRIES} attempts. Manual intervention required!`,
      );
    }

    await delay({ milliSeconds: DELAY });
  }

  logger.log(`${ALGO}: All trades confirmed closed.`);
  const mtm = await getMtm();
  await notify(`All trades closed. Final MTM: ${mtm}`);
  logger.log(`${ALGO}: Final MTM: ${mtm}`);
};

/**
 * Checks if a position with the same strike and option type already exists.
 */
export const checkPositionAlreadyExists = async ({
  position,
  trades,
}: CheckPosition) => {
  for (const trade of trades) {
    if (
      Number.parseInt(trade.strike) === Number.parseInt(position.strikeprice) &&
      trade.optionType === position.optiontype
    )
      return true;
  }
  return false;
};
