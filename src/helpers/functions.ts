import {
  getIndexScrip,
  getLtpData,
  getPositionsJson,
  getScrip,
} from './apiService';
import { get } from 'lodash';
import fs from 'fs';
import {
  BothPresent,
  Credentails,
  INDICES,
  ISmartApiData,
  JsonFileStructure,
  Position,
  TimeComparisonType,
  TradeDetails,
  delayType,
  reqType,
  updateMaxSlType,
} from '../app.interface';
import moment, { Moment } from 'moment-timezone';
import { ALGO, DATEFORMAT, DELAY } from './constants';
import { Request } from 'express';
import DataStore from '../store/dataStore';
import SmartSession from '../store/smartSession';
import OrderStore from '../store/orderStore';
export const setCred = (req: Request | reqType) => {
  const creds: Credentails = {
    APIKEY: req.body.api_key,
    CLIENT_CODE: req.body.client_code,
    CLIENT_PIN: req.body.client_pin,
    CLIENT_TOTP_PIN: req.body.client_totp_pin,
  };
  DataStore.getInstance().setPostData(creds);
};

type GetCurrentTimeAndPastTimeType = { currentTime: string; pastTime: string };
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

export const setSmartSession = (data: ISmartApiData) => {
  const smartData: ISmartApiData = {
    feedToken: data.feedToken,
    jwtToken: data.jwtToken,
    refreshToken: data.refreshToken,
  };
  SmartSession.getInstance().setPostData(smartData);
};
export const updateMaxSl = ({ mtm, maxSl, trailSl }: updateMaxSlType) => {
  if (mtm % trailSl === 0) {
    const quotientMultiplier = Math.floor(mtm / trailSl);
    maxSl += quotientMultiplier * trailSl;
  }
  return maxSl;
};
export const getLastWednesdayOfMonth = () => {
  const today = moment();
  const lastDayOfMonth = today.endOf('month');
  while (lastDayOfMonth.day() !== 3) {
    lastDayOfMonth.subtract(1, 'days');
  }
  return lastDayOfMonth;
};
export const getNextExpiry = () => {
  const today = moment();
  const currentDay = today.day();
  const isWednesday = currentDay === 3;
  const isLastWednesday =
    getLastWednesdayOfMonth().format('DDMMMYYYY').toUpperCase() ===
    today.format('DDMMMYYYY').toUpperCase();
  const isLastThursday =
    getLastThursdayOfCurrentMonth() === today.format('DDMMMYYYY').toUpperCase();
  const secondLastWednesday = getLastWednesdayOfMonth().subtract(7, 'days');
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
    today.isBefore(getLastWednesdayOfMonth()) &&
    today.isAfter(secondLastWednesday)
  ) {
    return getLastThursdayOfCurrentMonth();
  } else {
    const nextWednesday = today.add(daysToNextWednesday, 'days');
    return nextWednesday.format('DDMMMYYYY').toUpperCase();
  }
};

export const findNearestStrike = (options: object[], target: number) => {
  let nearestStrike = Infinity;
  let nearestDiff = Infinity;
  for (const option of options) {
    const strike = parseInt(get(option, 'strike', '')) / 100;
    const currentDiff = Math.abs(target - strike);
    if (currentDiff < nearestDiff) {
      nearestDiff = currentDiff;
      nearestStrike = strike;
    }
  }
  return nearestStrike;
};
export const getAtmStrikePrice = async () => {
  let expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  console.log(`${ALGO}: expiryDate is ${expiryDate}`);
  try {
    const optionChain = await getScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
      expiryDate: expiryDate,
    });
    console.log(
      `${ALGO}: fetched optionChain, it has ${optionChain.length} records`
    );
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
    // throw new Error(`ltpPrice is not a valid number!`);
    if (typeof ltpPrice === 'number' && !isNaN(ltpPrice)) {
      return findNearestStrike(optionChain, ltpPrice);
    } else {
      console.log(
        `${ALGO}: Oops, 'ltpPrice' is not a valid number! Cannot execute further.`
      );
      throw new Error(`ltpPrice is not a valid number!`);
    }
  } catch (error) {
    console.error(`${ALGO}: Error - ${error}`);
    throw error; // This will immediately stop further execution
  }
};
export const delay = ({ milliSeconds }: delayType) => {
  const FIVE_MINUTES = 5 * 60 * 1000;
  let delayInMilliseconds = 0;
  if (milliSeconds && typeof milliSeconds === 'number')
    delayInMilliseconds = milliSeconds;
  else if (milliSeconds && typeof milliSeconds === 'string')
    delayInMilliseconds = parseInt(milliSeconds);
  else delayInMilliseconds = FIVE_MINUTES;
  return new Promise((resolve) => {
    setTimeout(resolve, delayInMilliseconds);
  });
};
export const isCurrentTimeGreater = ({
  hours,
  minutes,
}: TimeComparisonType): boolean => {
  const currentTime = moment().tz('Asia/Kolkata');
  const targetTime = moment()
    .tz('Asia/Kolkata')
    .set({ hours, minutes, seconds: 0 });
  return currentTime.isAfter(targetTime);
};
export const getCurrentDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
};
export const removeJsonFile = async (): Promise<boolean> => {
  const currentDate = getCurrentDate();
  let fileName = `${currentDate}_trades.json`;
  const exists = fs.existsSync(fileName);
  if (exists)
    fs.unlink(fileName, (err) => {
      if (err) console.log(`${ALGO}: error deleting file ${err.message}`);
      else return true;
    });
  return false;
};
export const createJsonFile = async (): Promise<JsonFileStructure> => {
  const currentDate = getCurrentDate();
  let fileName = `${currentDate}_trades.json`;
  const exists = fs.existsSync(fileName);
  if (exists) {
    return readJsonFile();
  } else {
    let json: JsonFileStructure = {
      isTradeExecuted: false,
      accountDetails: {
        capitalUsed: 0,
      },
      tradeDetails: [],
      isTradeClosed: false,
      mtm: [],
    };
    await writeJsonFile(json);
    return json;
  }
};
export const isJson = (string: string) => {
  console.log(`${ALGO}: checking if json is proper.`);
  try {
    JSON.parse(string);
    return true;
  } catch (error) {
    return false;
  }
};
export const writeJsonFile = async (data: JsonFileStructure) => {
  const currentDate = getCurrentDate();
  let fileName = `${currentDate}_trades.json`;
  const dataToStoreString = JSON.stringify(data);
  console.log(`${ALGO}: json data: `, dataToStoreString);
  if (isJson(dataToStoreString)) {
    console.log(`${ALGO}: writing into json file with name ${fileName}`);
    fs.writeFile(fileName, dataToStoreString, (err) => {
      if (err) {
        console.error(`${ALGO}: Error writing data to file:`, err);
      } else {
        console.log(`${ALGO}: Data stored successfully in file: ${fileName}`);
      }
    });
    await delay({ milliSeconds: DELAY });
  }
};
export const readJsonFile = (): JsonFileStructure => {
  try {
    const currentDate = getCurrentDate();
    let fileName = `${currentDate}_trades.json`;
    console.log(`${ALGO}: reading from json file with name ${fileName}`);
    const dataFromFile = fs.readFileSync(fileName, 'utf-8');
    const dataFromFileJson: JsonFileStructure = JSON.parse(dataFromFile);
    return dataFromFileJson;
  } catch (error) {
    console.log(`${ALGO}: Error reading from json file`);
    console.log(error);
    throw error;
  }
};
export const checkStrike = (
  tradeDetails: TradeDetails[],
  strike: string
): boolean => {
  const expiry = OrderStore.getInstance().getPostData().EXPIRYDATE;
  for (const trade of tradeDetails) {
    if (
      parseInt(trade.strike) === parseInt(strike) &&
      trade.expireDate === expiry
    ) {
      return true;
    }
  }
  return false;
};
export const areBothOptionTypesPresentForStrike = (
  tradeDetails: TradeDetails[],
  strike: string
): BothPresent => {
  const expirationDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  let cePresent = false;
  let pePresent = false;
  const filteredTrades = tradeDetails
    .filter((trade) => trade.expireDate === expirationDate)
    .forEach((trade) => {
      const tradedStrike = parseInt(trade.strike);
      const compareStrike = parseInt(strike);
      if (tradedStrike === compareStrike) {
        if (trade.optionType === 'CE') {
          cePresent = true;
        } else if (trade.optionType === 'PE') {
          pePresent = true;
        }
      }
    });
  return { ce: cePresent, pe: pePresent, stike: strike };
};
export const getOpenPositions = (positions: Position[]): Position[] => {
  const openPositions = [];
  const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  for (const position of positions) {
    const netqty = parseInt(position.netqty);
    const positionExpiryDate = position.expirydate;
    if (netqty !== 0 && expiryDate === positionExpiryDate) {
      openPositions.push(position);
    }
  }
  return openPositions;
};
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
type GetNearestStrike = {
  algoTrades: TradeDetails[];
  atmStrike: number;
};
export const getNearestStrike = ({
  algoTrades,
  atmStrike,
}: GetNearestStrike): number => {
  let nearestStrike: number = Infinity;
  let minDifference = Number.MAX_SAFE_INTEGER;
  const expirationDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  algoTrades
    .filter((trade) => trade.expireDate === expirationDate)
    .forEach((trade) => {
      const strikeNumber = parseInt(trade.strike, 10);
      const difference = Math.abs(strikeNumber - atmStrike);
      if (difference < minDifference) {
        nearestStrike = strikeNumber;
        minDifference = difference;
      }
    });
  console.log(`${ALGO}: nearestStrike: ${nearestStrike}`);
  return nearestStrike;
};
export const getLastThursdayOfCurrentMonth = () => {
  const today = moment();
  let lastDayOfMonth = moment().endOf('month');
  // Loop backward from the last day until we find a Thursday
  while (lastDayOfMonth.day() !== 4) {
    lastDayOfMonth.subtract(1, 'days');
  }
  if (lastDayOfMonth.isBefore(today)) {
    lastDayOfMonth = moment().endOf('month');
    lastDayOfMonth.add(1, 'month');
    // Loop backward from the last day until we find a Thursday
    while (lastDayOfMonth.day() !== 4) {
      lastDayOfMonth.subtract(1, 'days');
    }
  }
  return lastDayOfMonth.format('DDMMMYYYY').toUpperCase();
};
export const roundToNearestHundred = (input: number): number => {
  return Math.ceil(input / 100) * 100;
};

export const hedgeCalculation = () => {
  return 1000;
};
export const getScripName = (expireDate: string) => {
  let scripName = '';
  const today = new Date(expireDate);
  if (today.getDay() === 1) {
    scripName = INDICES.MIDCPNIFTY;
  } else if (today.getDay() === 2) {
    scripName = INDICES.FINNIFTY;
  } else if (today.getDay() === 3) {
    scripName = INDICES.BANKNIFTY;
  } else if (today.getDay() === 4) {
    scripName = INDICES.NIFTY;
  } else if (today.getDay() === 5) {
    scripName = INDICES.MIDCPNIFTY;
  }
  return scripName;
};
export const getTodayExpiry = () => moment().format('DDMMMYYYY').toUpperCase();
export const isTradingHoliday = (): boolean => {
  const tradingHolidays = [
    '26-Jan-2024', // Republic Day
    '08-Mar-2024', // Mahashivratri
    '25-Mar-2024', // Holi
    '29-Mar-2024', // Good Friday
    '11-Apr-2024', // Id-Ul-Fitr (Ramzan Eid)
    '17-Apr-2024', // Ram Navmi
    '01-May-2024', // Maharashtra Day
    '17-Jun-2024', // Bakri Id
    '17-Jul-2024', // Muharram
    '15-Aug-2024', // Independence Day/Parsi New Year
    '02-Oct-2024', // Mahatma Gandhi Jayanti
    '01-Nov-2024', // Diwali Laxmi Pujan (Muhurat Trading)
    '15-Nov-2024', // Gurunanak Jayanti
    '25-Dec-2024', // Christmas
  ];
  // Get today's date
  const today = moment();
  // Check if today is in the array of trading holidays
  const isHoliday = tradingHolidays.some((holiday) => {
    const holidayDate = moment(holiday, 'DD-MMM-YYYY');
    return today.isSame(holidayDate, 'day');
  });
  return isHoliday;
};
export const getStrikeDifference = () => {
  switch (OrderStore.getInstance().getPostData().INDEX) {
    case INDICES.NIFTY:
    case INDICES.FINNIFTY:
      return 0.01;
    case INDICES.MIDCPNIFTY:
    case INDICES.SENSEX:
    case INDICES.BANKNIFTY:
      return 0.006;
    default:
      return 0.01;
  }
};
