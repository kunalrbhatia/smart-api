import { getIndexScrip, getLtpData, getScrip } from "./apiService";
import {
  BothPresent,
  Credentails,
  GetCurrentTimeAndPastTimeType,
  GetNearestStrike,
  INDICES,
  ISmartApiData,
  Position,
  TimeComparisonType,
  delayType,
  reqType,
  scripMasterResponse,
  updateMaxSlType,
} from "../app.interface";
import moment from "moment-timezone";
import { ALGO } from "./constants";
import { Request } from "express";
import DataStore from "../store/dataStore";
import OrderStore from "../store/orderStore";
import { getLastThursdayOfCurrentMonth, isCurrentTimeGreater, setCredentials } from "krb-smart-api-module";
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
export const getCurrentTimeAndPastTime = (): GetCurrentTimeAndPastTimeType => {
  let currentTime = moment();
  const endOfDay = moment("15:30", "HH:mm");
  const startOfDay = moment("09:15", "HH:mm");
  if (currentTime.isAfter(endOfDay)) {
    currentTime = endOfDay;
  } else if (currentTime.isBefore(startOfDay)) {
    currentTime = startOfDay;
    currentTime = currentTime.subtract(1, "day");
  }
  return {
    currentTime: currentTime.format("YYYY-MM-DD HH:mm"),
    pastTime: currentTime.subtract(40, "day").format("YYYY-MM-DD HH:mm"),
  };
};
export const updateMaxSl = ({ mtm, maxSl, trailSl }: updateMaxSlType) => {
  if (mtm % trailSl === 0) {
    const quotientMultiplier = Math.floor(mtm / trailSl);
    maxSl += quotientMultiplier * trailSl;
  }
  return maxSl;
};
export const getLastWednesdayOfMonth = () => {
  let today = moment();
  let lastDayOfMonth = today.endOf("month");
  let lastThursday = null;
  let lastWednesday = null;
  while (lastDayOfMonth.day() !== 4) {
    lastDayOfMonth.subtract(1, "days");
  }
  lastThursday = lastDayOfMonth.clone();
  lastDayOfMonth = today.endOf("month");
  while (lastDayOfMonth.day() !== 3) {
    lastDayOfMonth.subtract(1, "days");
  }
  lastWednesday = lastDayOfMonth.clone();
  today = moment();
  if (today.isAfter(lastThursday) || today.isAfter(lastWednesday)) return null;
  else return lastWednesday;
};

export const getNextExpiry = () => {
  const today = moment();
  const currentDay = today.day();
  const isWednesday = currentDay === 3;
  const lastWednesday = getLastWednesdayOfMonth();
  const isLastWednesday = lastWednesday
    ? lastWednesday.format("DDMMMYYYY").toUpperCase() === today.format("DDMMMYYYY").toUpperCase()
    : false;
  const isLastThursday = getLastThursdayOfCurrentMonth() === today.format("DDMMMYYYY").toUpperCase();

  const secondLastWednesday = lastWednesday ? lastWednesday.subtract(7, "days") : null;
  let daysToNextWednesday = 3 - currentDay;
  if (daysToNextWednesday < 0) {
    daysToNextWednesday += 7;
  }
  if (isLastThursday) {
    return today.format("DDMMMYYYY").toUpperCase();
  } else if (isLastWednesday) {
    return today.add(1, "days").format("DDMMMYYYY").toUpperCase();
  } else if (isWednesday) {
    return today.format("DDMMMYYYY").toUpperCase();
  } else if (today.isBefore(lastWednesday) && today.isAfter(secondLastWednesday)) {
    return getLastThursdayOfCurrentMonth();
  } else {
    const nextWednesday = today.add(daysToNextWednesday, "days");
    return nextWednesday.format("DDMMMYYYY").toUpperCase();
  }
};
export const findNearestStrike = (options: scripMasterResponse[], target: number) => {
  let nearestStrike = Infinity;
  let nearestDiff = Infinity;
  for (const option of options) {
    const strike = parseInt(option.strike) / 100;
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
    /* console.log(
      `${ALGO}: fetched optionChain, it has ${optionChain.length} records`
    ); */
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
    if (typeof ltpPrice === "number" && !isNaN(ltpPrice)) {
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

export const checkStrike = (tradeDetails: Position[], strike: string): boolean => {
  const expiry = OrderStore.getInstance().getPostData().EXPIRYDATE;
  for (const trade of tradeDetails) {
    if (parseInt(trade.strikeprice) === parseInt(strike) && trade.expirydate === expiry) {
      return true;
    }
  }
  return false;
};
export const areBothOptionTypesPresentForStrike = (tradeDetails: Position[], strike: string): BothPresent => {
  const expirationDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  let cePresent = false;
  let pePresent = false;
  const filteredTrades = tradeDetails
    .filter((trade) => trade.expirydate === expirationDate)
    .forEach((trade) => {
      const tradedStrike = parseInt(trade.strikeprice);
      const compareStrike = parseInt(strike);
      if (tradedStrike === compareStrike) {
        if (trade.optiontype === "CE") {
          cePresent = true;
        } else if (trade.optiontype === "PE") {
          pePresent = true;
        }
      }
    });
  return { ce: cePresent, pe: pePresent, stike: strike };
};
export const getOpenPositions = (positions: Position[]): Position[] => {
  const openPositions = [];
  const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  const indexName = OrderStore.getInstance().getPostData().INDEX;
  if (positions) {
    for (const position of positions) {
      const netqty = parseInt(position.netqty);
      const positionExpiryDate = position.expirydate;
      const symbolname = position.symbolname;
      if (netqty !== 0 && expiryDate === positionExpiryDate && symbolname === indexName) {
        openPositions.push(position);
      }
    }
  }
  return openPositions;
};
export const isMarketClosed = () => {
  if (isCurrentTimeGreater({ hours: 9, minutes: 15 }) && !isCurrentTimeGreater({ hours: 15, minutes: 30 })) {
    return false;
  } else {
    return true;
  }
};
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
export const hedgeCalculation = (index: string) => {
  switch (index) {
    case INDICES.NIFTY:
      return 400;
    case INDICES.FINNIFTY:
      return 400;
    case INDICES.MIDCPNIFTY:
      let date = new Date();
      if (date.getDay() === 5) return 150;
      else return 100;
    case INDICES.SENSEX:
    case INDICES.BANKNIFTY:
      return 1000;
    default:
      return 1000;
  }
};
