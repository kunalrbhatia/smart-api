import { getIndexScrip, getLtpWithRetry, getScrip } from './apiService';
import {
  BothPresent,
  Credentails,
  GetCurrentTimeAndPastTimeType,
  //GetNearestStrike,
  INDICES,
  //ISmartApiData,
  Position,
  //TimeComparisonType,
  //delayType,
  reqType,
  scripMasterResponse,
  updateMaxSlType,
} from '../app.interface';
import moment from 'moment-timezone';
import { ALGO } from './constants';
import { Request } from 'express';
import DataStore from '../store/dataStore';
import OrderStore from '../store/orderStore';
import {
  getLastThursdayOfCurrentMonth,
  isCurrentTimeGreater,
  setCredentials,
} from 'krb-smart-api-module';
import { logger } from './logger';

/**
 * Normalizes strikeprice string to integer — handles "25400.0" and "25400" both.
 */
const normalizeStrike = (strikeprice: string): number =>
  Math.round(Number(strikeprice));

/**
 * Checks if two expiry dates are the same by parsing them with moment.
 * Supports both DDMMMYYYY and DDMMMYY formats.
 */
export const isSameExpiry = (date1: string, date2: string): boolean => {
  if (!date1 || !date2) return false;
  // If exactly the same string, return true immediately
  if (date1.toUpperCase() === date2.toUpperCase()) return true;

  const formats = ['DDMMMYYYY', 'DDMMMYY', 'YYYY-MM-DD'];
  const m1 = moment(date1, formats);
  const m2 = moment(date2, formats);

  return m1.isValid() && m2.isValid() && m1.isSame(m2, 'day');
};

/**
 * Gets all open positions filtered by index and expiry date — standalone, no OrderStore dependency.
 * @param {Position[]} positions - Raw positions from SmartAPI
 * @param {string} index - Index name e.g. 'NIFTY', 'BANKNIFTY'
 * @param {string} expiryDate - Expiry in DDMMMYYYY format e.g. '17FEB2026'
 * @param {'ALL' | 'SELL' | 'BUY'} type - Which positions to return (default: 'ALL')
 * @returns {Position[]}
 */
export const getOpenPositionsByExpiry = (
  positions: Position[],
  index: string,
  expiryDate: string,
  type: 'ALL' | 'SELL' | 'BUY' = 'ALL',
): Position[] => {
  if (!Array.isArray(positions) || positions.length === 0) return [];

  return positions.filter(position => {
    const netqty = Number.parseInt(position.netqty);
    const isSameExp = isSameExpiry(position.expirydate, expiryDate);
    const isSameIndex = position.symbolname === index;
    const isOpen = netqty !== 0;

    if (!isSameExp || !isSameIndex || !isOpen) return false;

    if (type === 'SELL') return netqty < 0;
    if (type === 'BUY') return netqty > 0;
    return true; // 'ALL'
  });
};

/**
 * Gets the ATM strike price for a given index and expiry — standalone, no OrderStore dependency.
 * @param {string} scriptName - The index name e.g. 'NIFTY', 'BANKNIFTY'
 * @param {string} expiryDate - Expiry in DDMMMYYYY format e.g. '20FEB2025'
 * @returns {Promise<{ atmStrike: number; ltp: number; expiry: string; index: string }>}
 */
export const getAtmStrikePriceForIndex = async (
  scriptName: string,
  expiryDate: string,
): Promise<{
  atmStrike: number;
  ltp: number;
  expiry: string;
  index: string;
}> => {
  logger.log(
    `${ALGO}: Fetching ATM strike for ${scriptName} (Expiry: ${expiryDate})`,
  );

  // 1. Get all options for this index & expiry from scrip master
  const optionChain = await getScrip({ scriptName, expiryDate });
  if (!optionChain || optionChain.length === 0) {
    throw new Error(
      `No option chain found for ${scriptName} expiry ${expiryDate}`,
    );
  }

  // 2. Get the index scrip to fetch LTP (spot price)
  const indexScrip = await getIndexScrip({ scriptName });
  if (!indexScrip || indexScrip.length === 0) {
    throw new Error(`Index scrip not found for ${scriptName}`);
  }

  // 3. Fetch live LTP of the index
  const ltpData = await getLtpWithRetry({
    exchange: indexScrip[0].exch_seg,
    tradingsymbol: indexScrip[0].symbol,
    symboltoken: indexScrip[0].token,
    delayMs: 1000,
    maxRetries: 5,
  });

  const ltp = ltpData.ltp;
  logger.log(`${ALGO}: ${scriptName} spot LTP: ${ltp}`);

  if (typeof ltp !== 'number' || Number.isNaN(ltp) || ltp <= 0) {
    throw new Error(`Invalid LTP received for ${scriptName}: ${ltp}`);
  }

  // 4. Find nearest strike (reuses your existing findNearestStrike)
  const atmStrike = findNearestStrike(optionChain, ltp);
  logger.log(`${ALGO}: Calculated ATM Strike for ${scriptName}: ${atmStrike}`);

  return { atmStrike, ltp, expiry: expiryDate, index: scriptName };
};
/**
 * Sets the credentials for the smart API.
 * @param {Request | reqType} req - The request object containing the credentials.
 */
export const setCred = (req: Request | reqType) => {
  const creds: Credentails = {
    APIKEY: req.body.api_key,
    CLIENT_CODE: req.body.client_code,
    CLIENT_PIN: req.body.client_pin,
    CLIENT_TOTP_PIN: req.body.client_totp_pin,
  };
  setCredentials(creds);
  DataStore.getInstance().setPostData(creds);
};
/**
 * Gets the current time and a past time 40 days ago.
 * @returns {GetCurrentTimeAndPastTimeType} An object containing the current time and past time.
 */
export const getCurrentTimeAndPastTime = (): GetCurrentTimeAndPastTimeType => {
  let currentTime = moment();
  const endOfDay = moment('15:30', 'HH:mm');
  const startOfDay = moment('09:15', 'HH:mm');
  if (currentTime.isAfter(endOfDay)) {
    currentTime = endOfDay;
  } else if (currentTime.isBefore(startOfDay)) {
    currentTime = startOfDay;
    currentTime = currentTime.subtract(1, 'day');
  }
  return {
    currentTime: currentTime.format('YYYY-MM-DD HH:mm'),
    pastTime: currentTime.subtract(40, 'day').format('YYYY-MM-DD HH:mm'),
  };
};
/**
 * Updates the maximum stop loss based on the MTM and trail SL.
 * @param {updateMaxSlType} params - The parameters for updating the max SL.
 * @returns {number} The updated max SL.
 */
export const updateMaxSl = ({ mtm, maxSl, trailSl }: updateMaxSlType) => {
  if (mtm % trailSl === 0) {
    const quotientMultiplier = Math.floor(mtm / trailSl);
    maxSl += quotientMultiplier * trailSl;
  }
  return maxSl;
};
/**
 * Gets the last Wednesday of the current month.
 * @returns {moment.Moment | null} The last Wednesday of the month, or null if it has already passed.
 */
export const getLastWednesdayOfMonth = () => {
  let today = moment();
  let lastDayOfMonth = today.endOf('month');
  let lastThursday = null;
  let lastWednesday = null;
  while (lastDayOfMonth.day() !== 4) {
    lastDayOfMonth.subtract(1, 'days');
  }
  lastThursday = lastDayOfMonth.clone();
  lastDayOfMonth = today.endOf('month');
  while (lastDayOfMonth.day() !== 3) {
    lastDayOfMonth.subtract(1, 'days');
  }
  lastWednesday = lastDayOfMonth.clone();
  today = moment();
  if (today.isAfter(lastThursday)) return null;
  else return lastWednesday;
};
/**
 * Gets the next expiry date.
 * @returns {string} The next expiry date in DDMMMYYYY format.
 */
export const getNextExpiry = () => {
  const today = moment();
  const currentDay = today.day();
  const isWednesday = currentDay === 3;
  const lastWednesday = getLastWednesdayOfMonth();
  const isLastWednesday = lastWednesday
    ? lastWednesday.format('DDMMMYYYY').toUpperCase() ===
      today.format('DDMMMYYYY').toUpperCase()
    : false;
  const isLastThursday =
    getLastThursdayOfCurrentMonth() === today.format('DDMMMYYYY').toUpperCase();

  const secondLastWednesday = lastWednesday
    ? lastWednesday.clone().subtract(7, 'days')
    : null;
  let daysToNextWednesday = 3 - currentDay;
  if (daysToNextWednesday < 0) {
    daysToNextWednesday += 7;
  }
  if (isLastThursday) {
    return today.format('DDMMMYYYY').toUpperCase();
  } else if (isLastWednesday) {
    return today.add(1, 'days').format('DDMMMYYYY').toUpperCase();
  } else if (isWednesday) {
    return today.format('DDMMMYYYY').toUpperCase();
  } else if (
    today.isBefore(lastWednesday) &&
    today.isAfter(secondLastWednesday)
  ) {
    return getLastThursdayOfCurrentMonth();
  } else {
    const nextWednesday = today.add(daysToNextWednesday, 'days');
    return nextWednesday.format('DDMMMYYYY').toUpperCase();
  }
};
/**
 * Finds the nearest strike price from a list of options.
 * @param {scripMasterResponse[]} options - The list of options.
 * @param {number} target - The target price.
 * @returns {number} The nearest strike price.
 */
export const findNearestStrike = (
  options: scripMasterResponse[],
  target: number,
) => {
  let nearestStrike = Infinity;
  let nearestDiff = Infinity;
  for (const option of options) {
    const strike = Number.parseInt(option.strike) / 100;
    const currentDiff = Math.abs(target - strike);
    if (currentDiff < nearestDiff) {
      nearestDiff = currentDiff;
      nearestStrike = strike;
    }
  }
  return nearestStrike;
};
/**
 * Gets the At-The-Money (ATM) strike price.
 * @returns {Promise<number>} A promise that resolves with the ATM strike price.
 */
export const getAtmStrikePrice = async () => {
  const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  logger.log(`${ALGO}: Fetching ATM for expiry: ${expiryDate}`);
  try {
    const optionChain = await getScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
      expiryDate: expiryDate,
    });
    const bnfScrip = await getIndexScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
    });
    const ltp = await getLtpWithRetry({
      exchange: bnfScrip[0].exch_seg,
      tradingsymbol: bnfScrip[0].symbol,
      symboltoken: bnfScrip[0].token,
    });
    const ltpPrice = ltp.ltp;
    logger.log(`${ALGO}: Fetched LTP: ${ltpPrice}`);
    if (typeof ltpPrice === 'number' && !Number.isNaN(ltpPrice)) {
      return findNearestStrike(optionChain, ltpPrice);
    } else {
      logger.error(`${ALGO}: Invalid LTP received: ${ltpPrice}`);
      throw new Error(`ltpPrice is not a valid number!`);
    }
  } catch (error) {
    logger.error(`${ALGO} Error in getAtmStrikePrice:`, error);
    throw error; // This will immediately stop further execution
  }
};
/**
 * Checks if a strike is already traded.
 * @param {Position[]} tradeDetails - The list of trades.
 * @param {string} strike - The strike to check.
 * @returns {boolean} A boolean indicating if the strike is already traded.
 */
export const checkStrike = (
  tradeDetails: Position[],
  strike: string,
): boolean => {
  const expiry = OrderStore.getInstance().getPostData().EXPIRYDATE;
  for (const trade of tradeDetails) {
    if (
      Number.parseInt(trade.strikeprice) === Number.parseInt(strike) &&
      isSameExpiry(trade.expirydate, expiry)
    ) {
      return true;
    }
  }
  return false;
};
/**
 * Checks if both CE and PE option types are present for a given strike.
 * @param {Position[]} tradeDetails - The list of trades.
 * @param {string} strike - The strike to check.
 * @returns {BothPresent} An object indicating the presence of CE and PE options.
 */
export const areBothOptionTypesPresentForStrike = (
  tradeDetails: Position[],
  strike: string,
): BothPresent => {
  const expirationDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  let cePresent = false;
  let pePresent = false;
  tradeDetails
    .filter(trade => isSameExpiry(trade.expirydate, expirationDate))
    .forEach(trade => {
      const tradedStrike = Number.parseInt(trade.strikeprice);
      const compareStrike = Number.parseInt(strike);
      if (tradedStrike === compareStrike) {
        if (trade.optiontype === 'CE') {
          cePresent = true;
        } else if (trade.optiontype === 'PE') {
          pePresent = true;
        }
      }
    });
  return { ce: cePresent, pe: pePresent, stike: strike };
};
/**
 * Gets all open positions.
 * @param {Position[]} positions - The list of all positions.
 * @returns {Position[]} A list of open positions.
 */
export const getAllOpenPositions = (positions: Position[]): Position[] => {
  const openPositions = [];
  const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  const indexName = OrderStore.getInstance().getPostData().INDEX;
  if (positions) {
    for (const position of positions) {
      const netqty = Number.parseInt(position.netqty);
      const positionExpiryDate = position.expirydate;
      const symbolname = position.symbolname;
      if (
        netqty != 0 &&
        isSameExpiry(positionExpiryDate, expiryDate) &&
        symbolname === indexName
      ) {
        openPositions.push(position);
      }
    }
  }
  return openPositions;
};
/**
 * Gets all open sell positions.
 * @param {Position[]} positions - The list of all positions.
 * @returns {Position[]} A list of open sell positions.
 */
export const getOpenSellPositions = (positions: Position[]): Position[] => {
  const openPositions = [];
  const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  const indexName = OrderStore.getInstance().getPostData().INDEX;
  if (positions) {
    for (const position of positions) {
      const netqty = Number.parseInt(position.netqty);
      const positionExpiryDate = position.expirydate;
      const symbolname = position.symbolname;
      if (
        netqty < 0 &&
        isSameExpiry(positionExpiryDate, expiryDate) &&
        symbolname === indexName
      ) {
        openPositions.push(position);
      }
    }
  }
  return openPositions;
};
/**
 * Checks if the market is closed.
 * @returns {boolean} A boolean indicating if the market is closed.
 */
export const isMarketClosed = () => {
  if (
    isCurrentTimeGreater({ hours: 9, minutes: 15 }) &&
    !isCurrentTimeGreater({ hours: 15, minutes: 30 })
  ) {
    return false;
  } else {
    return true;
  }
};
/**
 * Gets the strike difference based on the index and India VIX.
 * @param {string} index - The index name.
 * @returns {number} The strike difference.
 */
export const getStrikeDifference = (index: string) => {
  const indiaVix = OrderStore.getInstance().getPostData().INDIAVIX;
  switch (index) {
    case INDICES.NIFTY:
    case INDICES.FINNIFTY:
    case INDICES.MIDCPNIFTY:
      return indiaVix < 14 ? 50 : 100;
    case INDICES.SENSEX:
    case INDICES.BANKNIFTY:
      return indiaVix < 14 ? 200 : 300;
    default:
      return 50;
  }
};
/**
 * Calculates the hedge variance based on the index.
 * @param {string} index - The index name.
 * @returns {number} The hedge variance.
 */
export const hedgeCalculation = (index: string) => {
  switch (index) {
    case INDICES.NIFTY:
      return 500;
    case INDICES.FINNIFTY:
      return 500;
    case INDICES.MIDCPNIFTY:
      return 200;
    case INDICES.SENSEX:
    case INDICES.BANKNIFTY:
      return 1500;
    default:
      return 1000;
  }
};
/**
 * Gets the strike variance based on the index.
 * @param {string} index - The index name.
 * @returns {number} The strike variance.
 */
export const getStrikeVariance = (index: string) => {
  switch (index) {
    case INDICES.NIFTY:
    case INDICES.FINNIFTY:
      return 50;
    case INDICES.BANKNIFTY:
      return 100;
    default:
      return 0;
  }
};

/**
 * Checks if there is an open position for a given ATM strike.
 */
export const hasOpenPositionForStrike = (
  positions: Position[],
  atmStrike: number,
): boolean => {
  return positions.some(p => normalizeStrike(p.strikeprice) === atmStrike);
};

/**
 * Counts unique ATM strikes already sold (each unique strike = 1 pair).
 */
export const countSellPairs = (positions: Position[]): number => {
  const sellPositions = positions.filter(p => Number.parseInt(p.netqty) < 0);
  const uniqueStrikes = new Set(
    sellPositions.map(p => normalizeStrike(p.strikeprice)),
  );
  return uniqueStrikes.size;
};

/**
 * Checks if hedge (BUY) positions already exist for this expiry.
 */
export const hasHedgePositions = (positions: Position[]): boolean => {
  return positions.some(p => Number.parseInt(p.netqty) > 0);
};
/**
 * Technical indicator calculations
 */

// Simple Moving Average
export const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period)
    throw new Error(`Not enough data for SMA(${period})`);
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
};

// Exponential Moving Average
export const calculateEMA = (data: number[], period: number): number => {
  if (data.length < period)
    throw new Error(`Not enough data for EMA(${period})`);

  const k = 2 / (period + 1);
  let ema = data[0];

  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }

  return ema;
};

// RSI (Relative Strength Index)
export const calculateRSI = (closes: number[], period: number = 14): number => {
  if (closes.length < period + 1) {
    throw new Error(
      `Not enough data for RSI(${period}). Need at least ${period + 1} candles.`,
    );
  }

  let gains = 0;
  let losses = 0;

  // Calculate gains and losses over the period
  for (let i = closes.length - period - 1; i < closes.length - 1; i++) {
    const diff = closes[i + 1] - closes[i];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff; // losses is positive
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100; // No losses means RSI = 100

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
};

// MACD (Moving Average Convergence Divergence)
export const calculateMACD = (
  closes: number[],
): { macd: number; signal: number; histogram: number } => {
  if (closes.length < 26) {
    throw new Error('Not enough data for MACD. Need at least 26 candles.');
  }

  const ema12 = calculateEMA(closes.slice(-26), 12);
  const ema26 = calculateEMA(closes.slice(-26), 26);
  const macd = ema12 - ema26;

  // Signal line is 9-period EMA of MACD
  // For simplicity, using single MACD value as signal (should ideally calculate over multiple MACD values)
  const signal = macd; // Simplified - in production, calculate EMA of multiple MACD values
  const histogram = macd - signal;

  return { macd, signal, histogram };
};

/**
 * Generates trading signal based on RSI and MACD
 */
export const generateTradingSignal = (
  closes: number[],
): {
  rsi: number;
  sma20: number;
  macd: number;
  macdSignal: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
} => {
  if (closes.length < 30) {
    throw new Error('Need at least 50 candles for complete analysis');
  }

  const rsi = calculateRSI(closes, 14);
  const sma20 = calculateSMA(closes, 20);
  const { macd, signal: macdSignal } = calculateMACD(closes);

  // Trading logic
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';

  if (rsi < 30 && macd > macdSignal) {
    signal = 'BUY'; // Oversold + bullish MACD crossover
  } else if (rsi > 70 && macd < macdSignal) {
    signal = 'SELL'; // Overbought + bearish MACD crossover
  }

  return {
    rsi: Number(rsi.toFixed(2)),
    sma20: Number(sma20.toFixed(2)),
    macd: Number(macd.toFixed(2)),
    macdSignal: Number(macdSignal.toFixed(2)),
    signal,
  };
};
