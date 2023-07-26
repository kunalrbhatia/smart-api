import { getLtpData, getScrip } from './apiService';
import { get } from 'lodash';
import fs from 'fs';
import { JsonFileStructure, TradeDetails } from '../app.interface';
export const getNextExpiry = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilThursday = 4 - dayOfWeek;
  const comingThursday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysUntilThursday
  );
  // Get the year, month, and day of the coming Thursday
  const year = comingThursday.getFullYear();
  const month = comingThursday.getMonth() + 1;
  const day = comingThursday.getDate();

  // Format the date as ddmmmyyyy
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
  milliSeconds: number;
};
export const delay = ({ milliSeconds }: delayType) => {
  return new Promise((resolve) => {
    setTimeout(resolve, milliSeconds);
  });
};
type isPastTimeType = { hours: number; minutes: number };
export const isPastTime = ({ hours, minutes }: isPastTimeType): boolean => {
  const currentTime = new Date();
  const targetTime = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate(),
    hours,
    minutes,
    0
  );
  return currentTime > targetTime;
};
export const getCurrentDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
};
export const createJsonFile = (): JsonFileStructure => {
  let json: JsonFileStructure = {
    isTradeExecuted: false,
    accountDetails: {
      capitalUsed: 0,
    },
    tradeDetails: [],
  };
  const currentDate = getCurrentDate();
  const fileName = `${currentDate}_trades.json`;
  const exists = fs.existsSync(fileName);
  if (exists) {
    const dataFromFile = fs.readFileSync(fileName, 'utf-8');
    const dataFromFileJson = JSON.parse(
      dataFromFile || JSON.stringify({ data: 'defualt value' })
    );
    json = dataFromFileJson;
  } else {
    const dataToStoreString = JSON.stringify(json);
    fs.writeFile(fileName, dataToStoreString, (err) => {
      if (err) {
        console.error('Error writing data to file:', err);
      } else {
        console.log(`Data stored successfully in file: ${fileName}`);
      }
    });
  }
  return json;
};
export const writeJsonFile = (data: JsonFileStructure) => {
  const currentDate = getCurrentDate();
  const fileName = `${currentDate}_trades.json`;
  const dataToStoreString = JSON.stringify(data);
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
    if (trade.call.strike === strike || trade.put.strike === strike) {
      return true;
    }
  }
  return false;
};
