import { get as _get } from 'lodash';
import {
  DELAY,
  delay,
  getCredentials,
  CREDENTIALS,
} from 'krb-smart-api-module';

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
  smartSession: ISmartApiData,
  cred: CREDENTIALS,
  maxRetries: number = 5,
  delayMs: number = 1000,
): Promise<Position[]> => {
  if (isPaperMode()) {
    const paperPositions = getPaperPositions();
    // Update LTP for paper positions
    const { getLtpData } = await import('./marketData');
    for (const pos of paperPositions) {
      try {
        const ltpData = await getLtpData({
          exchange: pos.exchange,
          symboltoken: pos.symboltoken,
          tradingsymbol: pos.tradingsymbol,
        });
        if (ltpData && ltpData.ltp) {
          pos.ltp = ltpData.ltp.toString();
          const netQty = Number.parseInt(pos.netqty);
          const buyVal = Number.parseFloat(pos.totalbuyvalue);
          const sellVal = Number.parseFloat(pos.totalsellvalue);
          // Simple unrealised P&L: (netQty * LTP) + (sellVal - buyVal)
          // Actually: (Total Sell Value - Total Buy Value) + (Net Quantity * Current Price)
          pos.unrealised = (sellVal - buyVal + netQty * ltpData.ltp).toFixed(2);
          pos.pnl = (
            Number.parseFloat(pos.realised) + Number.parseFloat(pos.unrealised)
          ).toFixed(2);
        }
      } catch (e) {
        logger.error(
          `[PAPER] Failed to update LTP for ${pos.tradingsymbol}`,
          e,
        );
      }
    }
    savePaperPositions(paperPositions);
    return paperPositions;
  }

  const headers = await getAuthHeaders();
  // ... (rest of the function)

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(
        'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPositions',
        {
          method: 'get',
          headers,
        },
      );
      await delay({ milliSeconds: DELAY });
      const responseJson = await response.json();

      if (response.status >= 200 && response.status < 300) {
        const positions = _get(responseJson, 'data', []) as Position[];

        if (Array.isArray(positions)) {
          logger.log(
            `${ALGO}: getPositions — Success on attempt ${attempt + 1}. Total positions: ${positions.length}`,
          );
          return positions;
        }
      }
    } catch (error) {
      logger.error(
        `${ALGO}: getPositions — Error on attempt ${attempt + 1}/${maxRetries}:`,
        error,
      );
      if (attempt + 1 >= maxRetries) throw error;
    }

    const backoffMs = delayMs * Math.pow(2, attempt);
    await delay({ milliSeconds: backoffMs });
    attempt++;
  }

  throw new Error(
    `${ALGO}: getPositions — Failed to get valid positions after ${maxRetries} attempts`,
  );
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
    const { getLtpData } = await import('./marketData');

    for (const position of positions) {
      if (isAbrupt && Number.parseInt(position.netqty) !== 0) {
        await closeParticularTrade({ trade: position });
      } else if (!isAbrupt) {
        const ltpData = await getLtpData({
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
export const getMtm = async () => {
  const smartSession = await getSmartSession();
  const cred = getCredentials();
  await delay({ milliSeconds: DELAY });
  const tradedPositions: Position[] = await getPositions(smartSession, cred);
  const tradedExpiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  const tradedIndex = OrderStore.getInstance().getPostData().INDEX;
  let mtm = 0;
  if (tradedPositions !== null) {
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
