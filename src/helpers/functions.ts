import { getLtpData, getScrip } from './apiService';
import { get } from 'lodash';
import fs from 'fs';
import { JsonFileStructure, Position, TradeDetails } from '../app.interface';
import moment from 'moment-timezone';
export const getNextExpiry = () => {
  /*
   *const today = new Date('08/03/2023');
   *For testing getNextExpiry logic
   */
  const today = new Date();
  const dayOfWeek = today.getDay();
  const isThursday = dayOfWeek === 4;
  const isWednesday = dayOfWeek === 3;
  const daysUntilNextThursday = () => {
    if (isWednesday) return 8;
    else if (isThursday) return 7;
    else return (11 - dayOfWeek) % 7;
  };
  const comingThursday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysUntilNextThursday()
  );
  const year = comingThursday.getFullYear();
  const month = comingThursday.getMonth() + 1;
  const day = comingThursday.getDate().toString().padStart(2, '0');
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const monthName = months[month - 1];
  const formattedDate = `${day}${monthName}${year}`;
  return formattedDate;
};
function findNearestStrike(options: object[], target: number) {
  let nearestStrike = parseInt(get(options, '0.strike', '') || '') / 100; // Assume the first strike as the nearest initially
  let nearestDiff = Math.abs(target - nearestStrike); // Calculate the difference
  // Iterate through the remaining strikes to find the nearest one
  for (let i = 1; i < options.length; i++) {
    let currentDiff = Math.abs(
      target - parseInt(get(options, `${i}.strike`, '')) / 100
    );
    if (currentDiff < nearestDiff) {
      nearestDiff = currentDiff;
      nearestStrike = parseInt(get(options, `${i}.strike`, '')) / 100;
    }
  }

  return nearestStrike;
}
export const getAtmStrikePrice = async () => {
  const expiryDate = getNextExpiry();
  const optionChain = await getScrip({
    scriptName: 'BANKNIFTY',
    expiryDate: expiryDate,
  });
  const ltp = await getLtpData({
    exchange: 'NSE',
    tradingsymbol: 'BANKNIFTY',
    symboltoken: '26009',
  });
  const nearestStrike = findNearestStrike(
    optionChain,
    parseInt(get(ltp, 'ltp', ''))
  );
  return nearestStrike;
};
type delayType = {
  milliSeconds: number | undefined | string;
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
export type TimeComparisonType = { hours: number; minutes: number };
export const isCurrentTimeGreater = ({
  hours,
  minutes,
}: TimeComparisonType): boolean => {
  const currentTime = moment().tz('Asia/Kolkata'); // Set your local time zone here (IST)
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
export const createJsonFile = (): JsonFileStructure => {
  const currentDate = getCurrentDate();
  const fileName = `${currentDate}_trades.json`;
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
    };
    writeJsonFile(json);
    return json;
  }
};
export const writeJsonFile = (data: JsonFileStructure) => {
  const currentDate = getCurrentDate();
  const fileName = `${currentDate}_trades.json`;
  const dataToStoreString = JSON.stringify(data);
  console.log('json data: ', dataToStoreString);
  fs.writeFile(fileName, dataToStoreString, (err) => {
    if (err) {
      console.error('Error writing data to file:', err);
    } else {
      console.log(`Data stored successfully in file: ${fileName}`);
    }
  });
};
export const readJsonFile = (): JsonFileStructure => {
  const currentDate = getCurrentDate();
  const fileName = `${currentDate}_trades.json`;
  const dataFromFile = fs.readFileSync(fileName, 'utf-8');
  const dataFromFileJson = JSON.parse(
    dataFromFile || JSON.stringify({ data: 'defualt value' })
  );
  return dataFromFileJson;
};
export const checkStrike = (
  tradeDetails: TradeDetails[],
  strike: string
): boolean => {
  for (const trade of tradeDetails) {
    if (
      get(trade, 'call.stike', '') === strike ||
      get(trade, 'put.stike', '') === strike
    ) {
      return true;
    }
  }
  return false;
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
