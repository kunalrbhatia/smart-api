import { getLtpData, getPositionsJson, getScrip } from './apiService';
import { get } from 'lodash';
import fs from 'fs';
import {
  BothPresent,
  Credentails,
  JsonFileStructure,
  Position,
  TimeComparisonType,
  TradeDetails,
  TradeType,
  delayType,
  reqType,
} from '../app.interface';
import moment from 'moment-timezone';
import { ALGO, DELAY } from './constants';
import { Request } from 'express';
import DataStore from '../store/dataStore';
export const setCred = (req: Request | reqType) => {
  const creds: Credentails = {
    APIKEY: req.body.api_key,
    CLIENT_CODE: req.body.client_code,
    CLIENT_PIN: req.body.client_pin,
    CLIENT_TOTP_PIN: req.body.client_totp_pin,
  };
  DataStore.getInstance().setPostData(creds);
};
export const convertDateToFormat = (date: Date, format: string) => {
  return moment(date).format(format).toUpperCase();
};
export const getNextExpiry = () => {
  /*
   *const today = new Date('08/03/2023');
   *For testing getNextExpiry logic
   */
  const today = new Date(Date.now());
  const dayOfWeek = today.getDay();
  const isWednesday = dayOfWeek === 3;
  const isTuesday = dayOfWeek === 2;
  const isLastWeekOfMonth = today.getDate() > 24; // Check if it's the last week of the month
  const daysUntilNextWednesday = () => {
    if (isLastWeekOfMonth) {
      return 4 - dayOfWeek;
    }
    if (isWednesday) return 7;
    if (isTuesday) return 8;
    else return (3 - dayOfWeek + 7) % 7;
  };
  const calculatedDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysUntilNextWednesday()
  );
  return convertDateToFormat(calculatedDate, 'DDMMMYYYY');
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
export const getAtmStrikePrice = async (
  tradeType: TradeType = TradeType.INTRADAY
) => {
  let expiryDate = getNextExpiry();
  if (TradeType.POSITIONAL === tradeType) {
    expiryDate = getLastThursdayOfCurrentMonth();
  }
  console.log(`${ALGO}: expiryDate is ${expiryDate}`);
  try {
    const optionChain = await getScrip({
      scriptName: 'BANKNIFTY',
      expiryDate: expiryDate,
    });
    console.log(
      `${ALGO}: fetched optionChain, it has ${optionChain.length} records`
    );
    const ltp = await getLtpData({
      exchange: 'NSE',
      tradingsymbol: 'BANKNIFTY',
      symboltoken: '26009',
    });
    const ltpPrice = ltp.ltp;
    console.log(`${ALGO}: fetched ltp ${ltpPrice}`);
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
export const createJsonFile = async (
  tradeType: TradeType = TradeType.INTRADAY
): Promise<JsonFileStructure> => {
  const currentDate = getCurrentDate();
  let fileName = `${currentDate}_trades.json`;
  if (tradeType === TradeType.POSITIONAL) {
    fileName = `positional_trades.json`;
  }
  const exists = fs.existsSync(fileName);
  if (exists) {
    return readJsonFile(tradeType);
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
    await writeJsonFile(json, tradeType);
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
export const writeJsonFile = async (
  data: JsonFileStructure,
  tradeType: TradeType = TradeType.INTRADAY
) => {
  const currentDate = getCurrentDate();
  let fileName = `${currentDate}_trades.json`;
  if (tradeType === TradeType.POSITIONAL) {
    fileName = `positional_trades.json`;
  }
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
export const getOnlyAlgoTradedPositions = (
  tradeType: TradeType = TradeType.INTRADAY
): TradeDetails[] => {
  let data = readJsonFile(tradeType);
  let trades = data.tradeDetails;
  const algoTradedPositions: TradeDetails[] = [];
  trades.forEach((trade) => {
    if (trade.isAlgoCreatedPosition) algoTradedPositions.push(trade);
  });
  return algoTradedPositions;
};
export const readJsonFile = (
  tradeType: TradeType = TradeType.INTRADAY
): JsonFileStructure => {
  try {
    const currentDate = getCurrentDate();
    let fileName = `${currentDate}_trades.json`;
    if (tradeType === TradeType.POSITIONAL) {
      fileName = `positional_trades.json`;
    }
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
  for (const trade of tradeDetails) {
    if (trade.strike === strike) {
      return true;
    }
  }
  return false;
};
export const areBothOptionTypesPresentForStrike = (
  tradeDetails: TradeDetails[],
  strike: string
): BothPresent => {
  let cePresent = false;
  let pePresent = false;
  for (const trade of tradeDetails) {
    const tradedStrike = parseInt(trade.strike);
    const compareStrike = parseInt(strike);

    if (tradedStrike === compareStrike) {
      if (trade.optionType === 'CE') {
        cePresent = true;
      } else if (trade.optionType === 'PE') {
        pePresent = true;
      }
    }
  }

  // If either 'CE' or 'PE' is not present, return false
  return { ce: cePresent, pe: pePresent, stike: strike };
};
export const getOpenPositions = (positions: Position[]): Position[] => {
  const openPositions = [];
  for (const position of positions) {
    const netqty = parseInt(position.netqty);
    if (netqty > 0 || netqty < 0) {
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
  algoTrades.forEach((trade) => {
    const strikeNumber = parseInt(trade.strike, 10);
    const difference = Math.abs(strikeNumber - atmStrike);
    if (difference < minDifference) {
      nearestStrike = strikeNumber;
      minDifference = difference;
    }
  });
  return nearestStrike;
};
export const getLastThursdayOfCurrentMonth = (): string => {
  const today = new Date(Date.now());
  const year = today.getFullYear();
  const month = today.getMonth();
  // Start from the last day of the current month
  let lastDayOfMonth = new Date(year, month + 1, 0);
  // Loop backward from the last day until we find a Thursday (Thursday is represented by 4)
  while (lastDayOfMonth.getDay() !== 4) {
    lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
  }
  return convertDateToFormat(lastDayOfMonth, 'DDMMMYYYY');
};
export const getisAlgoCreatedPosition = (
  tradeType: TradeType,
  position: Position
) => {
  if (tradeType === TradeType.POSITIONAL && position.symbolname === 'BANKNIFTY')
    return true;
  else return false;
};
export const getData = async (tradeType: TradeType) => {
  if (tradeType === TradeType.INTRADAY) return readJsonFile(tradeType);
  else return await getPositionsJson(tradeType);
};
export const checkPositionsExistsForMonthlyExpiry = (
  openPositions: Position[]
): boolean => {
  return openPositions.some(
    (position) =>
      position.symbolname === 'BANKNIFTY' &&
      position.expirydate === getLastThursdayOfCurrentMonth()
  );
};
