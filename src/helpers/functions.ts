import { getLtpData, getScrip } from './apiService';
import { get } from 'lodash';
import fs from 'fs';
import { JsonFileStructure } from '../app.interface';
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
export const isPastTime = (): boolean => {
  const currentTime = new Date();
  const targetTime = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    currentTime.getDate(),
    10,
    15,
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
  // Example data to store in the JSON file
  const dataToStore: JsonFileStructure = {
    isTradeExecuted: false,
    accountDetails: {
      capitalUsed: 0,
    },
    tradeDetails: [
      {
        call: { strike: '', token: '', mtm: 0 },
        put: { strike: '', token: '', mtm: 0 },
        mtmTotal: 0,
      },
    ],
  };
  // Generate the file name with the current date
  const currentDate = getCurrentDate();
  const fileName = `${currentDate}_trades.json`;
  // Convert the data to a JSON string
  const dataToStoreString = JSON.stringify(dataToStore);
  // Write the data to the file
  fs.writeFile(fileName, dataToStoreString, (err) => {
    if (err) {
      console.error('Error writing data to file:', err);
    } else {
      console.log(`Data stored successfully in file: ${fileName}`);
    }
  });
  return dataToStore;
};
