import { getIndexScrip, getLtpData, getScrip } from './apiService';
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
import { getLastThursdayOfCurrentMonth, isCurrentTimeGreater, setCredentials } from 'krb-smart-api-module';
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
    ? lastWednesday.format('DDMMMYYYY').toUpperCase() === today.format('DDMMMYYYY').toUpperCase()
    : false;
  const isLastThursday = getLastThursdayOfCurrentMonth() === today.format('DDMMMYYYY').toUpperCase();

  const secondLastWednesday = lastWednesday ? lastWednesday.subtract(7, 'days') : null;
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
  } else if (today.isBefore(lastWednesday) && today.isAfter(secondLastWednesday)) {
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
export const findNearestStrike = (options: scripMasterResponse[], target: number) => {
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
  console.log(`${ALGO}: expiryDate is ${expiryDate}`);
  try {
    const optionChain = await getScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
      expiryDate: expiryDate,
    });
    const bnfScrip = await getIndexScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
    });
    const ltp = await getLtpData({
      exchange: bnfScrip[0].exch_seg,
      tradingsymbol: bnfScrip[0].symbol,
      symboltoken: bnfScrip[0].token,
    });
    const ltpPrice = ltp.ltp;
    console.log(`${ALGO}: fetched ltp ${ltpPrice}`);
    if (typeof ltpPrice === 'number' && !Number.isNaN(ltpPrice)) {
      return findNearestStrike(optionChain, ltpPrice);
    } else {
      console.log(`${ALGO}: Oops, 'ltpPrice' is not a valid number! Cannot execute further.`);
      throw new Error(`ltpPrice is not a valid number!`);
    }
  } catch (error) {
    console.error(`${ALGO}: Error - ${error}`);
    throw error; // This will immediately stop further execution
  }
};
/**
 * Checks if a strike is already traded.
 * @param {Position[]} tradeDetails - The list of trades.
 * @param {string} strike - The strike to check.
 * @returns {boolean} A boolean indicating if the strike is already traded.
 */
export const checkStrike = (tradeDetails: Position[], strike: string): boolean => {
  const expiry = OrderStore.getInstance().getPostData().EXPIRYDATE;
  for (const trade of tradeDetails) {
    if (Number.parseInt(trade.strikeprice) === Number.parseInt(strike) && trade.expirydate === expiry) {
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
export const areBothOptionTypesPresentForStrike = (tradeDetails: Position[], strike: string): BothPresent => {
  const expirationDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  let cePresent = false;
  let pePresent = false;
  tradeDetails
    .filter(trade => trade.expirydate === expirationDate)
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
      if (netqty != 0 && expiryDate === positionExpiryDate && symbolname === indexName) {
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
      if (netqty < 0 && expiryDate === positionExpiryDate && symbolname === indexName) {
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
  if (isCurrentTimeGreater({ hours: 9, minutes: 15 }) && !isCurrentTimeGreater({ hours: 15, minutes: 30 })) {
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
