import fs from 'fs';
import path from 'path';
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
import { getSmartSession } from './session';
import { doOrder } from './orders';
import {
  isPaperMode,
  getPaperPositions,
  savePaperPositions,
} from '../paperTrade';

const POSITIONS_FILE = path.join(process.cwd(), 'positions.json');

export const getAlgoPositions = (): Position[] => {
  if (isPaperMode()) {
    return getPaperPositions();
  }
  if (!fs.existsSync(POSITIONS_FILE)) return [];
  try {
    const data = fs.readFileSync(POSITIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    logger.error('Failed to read positions.json:', err);
    return [];
  }
};

export const saveAlgoPositions = (positions: Position[]): void => {
  if (isPaperMode()) {
    savePaperPositions(positions);
    return;
  }
  try {
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));
  } catch (err) {
    logger.error('Failed to save positions.json:', err);
  }
};

export const updateLivePositions = async ({
  symboltoken,
  tradingsymbol,
  transactionType,
  quantity,
  exchange,
}: {
  symboltoken: string;
  tradingsymbol: string;
  transactionType: 'BUY' | 'SELL';
  quantity: number;
  exchange: string;
}) => {
  let price = 0;
  try {
    const { getLtpWithRetry } = await import('./marketData');
    const ltpData = await getLtpWithRetry({
      exchange,
      symboltoken,
      tradingsymbol,
    });
    price = ltpData.ltp;
  } catch (err) {
    logger.error(
      `Failed to fetch LTP for ${tradingsymbol} while updating live positions:`,
      err,
    );
  }

  const positions = getAlgoPositions();
  const existingIdx = positions.findIndex(p => p.symboltoken === symboltoken);
  const qty = transactionType === 'BUY' ? quantity : -quantity;

  if (existingIdx >= 0) {
    const p = positions[existingIdx];
    const oldNetQty = Number.parseInt(p.netqty);
    const newNetQty = oldNetQty + qty;

    p.netqty = newNetQty.toString();
    if (transactionType === 'BUY') {
      const oldBuyQty = Number.parseInt(p.buyqty);
      const oldBuyVal = Number.parseFloat(p.totalbuyvalue);
      p.buyqty = (oldBuyQty + quantity).toString();
      p.totalbuyvalue = (oldBuyVal + quantity * price).toString();
      p.buyavgprice = (
        Number.parseFloat(p.totalbuyvalue) / Number.parseInt(p.buyqty)
      ).toString();
    } else {
      const oldSellQty = Number.parseInt(p.sellqty);
      const oldSellVal = Number.parseFloat(p.totalsellvalue);
      p.sellqty = (oldSellQty + quantity).toString();
      p.totalsellvalue = (oldSellVal + quantity * price).toString();
      p.sellavgprice = (
        Number.parseFloat(p.totalsellvalue) / Number.parseInt(p.sellqty)
      ).toString();
    }
    p.netvalue = (
      Number.parseFloat(p.totalbuyvalue) - Number.parseFloat(p.totalsellvalue)
    ).toString();

    if (oldNetQty < 0 && qty > 0) {
      const coveredQty = Math.min(Math.abs(oldNetQty), qty);
      const sellAvg = Number.parseFloat(p.sellavgprice);
      p.realised = (
        Number.parseFloat(p.realised) +
        coveredQty * (sellAvg - price)
      ).toString();
    } else if (oldNetQty > 0 && qty < 0) {
      const soldQty = Math.min(oldNetQty, Math.abs(qty));
      const buyAvg = Number.parseFloat(p.buyavgprice);
      p.realised = (
        Number.parseFloat(p.realised) +
        soldQty * (price - buyAvg)
      ).toString();
    }
  } else {
    let strikeprice = '0';
    let optiontype: 'CE' | 'PE' = 'CE';
    const symbolRegex = /^([A-Z]+)(\d{2}[A-Z]{3}\d{2})(\d+\.?\d*)([CP]E)$/;
    const match = tradingsymbol.match(symbolRegex);
    if (match) {
      strikeprice = match[3];
      optiontype = match[4] as 'CE' | 'PE';
    }

    const postData = OrderStore.getInstance().getPostData();

    const newPos: Position = {
      symboltoken,
      tradingsymbol,
      symbolname:
        postData.INDEX ||
        (tradingsymbol.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY'),
      expirydate: postData.EXPIRYDATE || '',
      exchange,
      strikeprice,
      optiontype,
      netqty: qty.toString(),
      buyqty: transactionType === 'BUY' ? quantity.toString() : '0',
      sellqty: transactionType === 'SELL' ? quantity.toString() : '0',
      totalbuyvalue:
        transactionType === 'BUY' ? (quantity * price).toString() : '0',
      totalsellvalue:
        transactionType === 'SELL' ? (quantity * price).toString() : '0',
      buyavgprice: transactionType === 'BUY' ? price.toString() : '0',
      sellavgprice: transactionType === 'SELL' ? price.toString() : '0',
      netvalue: (transactionType === 'BUY'
        ? quantity * price
        : -(quantity * price)
      ).toString(),
      realised: '0',
      unrealised: '0',
      ltp: price.toString(),
      lotsize: '1',
      instrumenttype: 'OPTIDX',
      priceden: '1',
      pricenum: '1',
      genden: '1',
      gennum: '1',
      precision: '2',
      multiplier: '1',
      boardlotsize: '1',
      symbolgroup: '',
      cfbuyqty: '0',
      cfsellqty: '0',
      cfbuyamount: '0',
      cfsellamount: '0',
      avgnetprice: '0',
      totalbuyavgprice: '0',
      totalsellavgprice: '0',
      netprice: '0',
      buyamount: '0',
      sellamount: '0',
      pnl: '0',
      close: '0',
      producttype: 'CARRYFORWARD',
      cfbuyavgprice: '0',
      cfsellavgprice: '0',
    };
    positions.push(newPos);
  }
  saveAlgoPositions(positions);
};

export const getPositions = async (
  _smartSession: ISmartApiData,
  _cred: CREDENTIALS,
): Promise<Position[]> => {
  const isPaper = isPaperMode();
  const positions = isPaper ? getPaperPositions() : getAlgoPositions();

  const { getLtpWithRetry } = await import('./marketData');
  for (const pos of positions) {
    let retryAttempt = 0;
    const MAX_LTP_RETRIES = 3;
    let success = false;

    while (retryAttempt < MAX_LTP_RETRIES && !success) {
      try {
        const ltpData = await getLtpWithRetry({
          exchange: pos.exchange,
          symboltoken: pos.symboltoken,
          tradingsymbol: pos.tradingsymbol,
          maxRetries: 1,
        });

        if (ltpData && ltpData.ltp) {
          pos.ltp = ltpData.ltp.toString();
          const netQty = Number.parseInt(pos.netqty);
          const buyVal = Number.parseFloat(pos.totalbuyvalue);
          const sellVal = Number.parseFloat(pos.totalsellvalue);
          pos.unrealised = (sellVal - buyVal + netQty * ltpData.ltp).toFixed(2);
          pos.pnl = (
            Number.parseFloat(pos.realised) + Number.parseFloat(pos.unrealised)
          ).toFixed(2);
          success = true;
        }
      } catch (e: any) {
        retryAttempt++;
        if (retryAttempt >= MAX_LTP_RETRIES) {
          logger.error(
            `Failed to update LTP for ${pos.tradingsymbol} after ${MAX_LTP_RETRIES} attempts`,
            e,
          );
        } else {
          const backoffDelay = 3000 * Math.pow(2, retryAttempt - 1);
          logger.warn(
            `Rate limit or error for ${pos.tradingsymbol}. Retrying in ${backoffDelay}ms (Attempt ${retryAttempt}/${MAX_LTP_RETRIES})`,
          );
          await delay({ milliSeconds: backoffDelay });
        }
      }
    }
    await delay({ milliSeconds: 350 });
  }

  if (isPaper) {
    savePaperPositions(positions);
  } else {
    saveAlgoPositions(positions);
  }
  return positions;
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
}; /**
 * Closes all open trades.
 * @returns {Promise<number>} The number of positions eligible for closure.
 */
export const closeAllTrades = async (isAbrupt = false): Promise<number> => {
  let eligibleCount = 0;
  try {
    await delay({ milliSeconds: DELAY });
    const positions = await getPositionsJson(isAbrupt);

    if (!Array.isArray(positions) || positions.length === 0) return 0;

    // Import marketData at the start of the function, not inside the loop
    const { getLtpWithRetry } = await import('./marketData');

    for (const position of positions) {
      const netQty = Number.parseInt(position.netqty);
      if (isAbrupt && netQty !== 0) {
        eligibleCount++;
        await closeParticularTrade({ trade: position });
      } else if (!isAbrupt) {
        const ltpData = await getLtpWithRetry({
          exchange: position.exchange,
          tradingsymbol: position.tradingsymbol,
          symboltoken: position.symboltoken,
        });

        const isNetqtyNegative = netQty < 0;
        const isLtpGreaterThanFive = ltpData && ltpData.ltp > 5;

        if (isNetqtyNegative && isLtpGreaterThanFive) {
          eligibleCount++;
          await closeParticularTrade({ trade: position });
        }
      }
    }
  } catch (error) {
    logger.error(`${ALGO}: closeAllTrades failed:`, error);
    throw error;
  }
  return eligibleCount;
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
  logger.mtm(`${tradedIndex || 'ALGO'}: MTM = ${mtm}`);
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
    const eligibleCount = await closeAllTrades(isAbrupt);

    // If there are no positions eligible for closure (e.g. all remaining have LTP <= 5), stop retrying
    if (eligibleCount === 0) {
      logger.log(
        `${ALGO}: No more eligible positions to close (others are <= 5 LTP or hedges).`,
      );
      break;
    }

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
  logger.mtm(`${ALGO}: Final MTM: ${mtm}`);
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
