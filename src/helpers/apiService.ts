import { get, isArray } from 'lodash';
let { SmartAPI } = require('smartapi-javascript');
const axios = require('axios');
const totp = require('totp-generator');
import dotenv from 'dotenv';
import {
  TimeComparisonType,
  checkStrike,
  createJsonFile,
  delay,
  getAtmStrikePrice,
  getNextExpiry,
  getOpenPositions,
  isCurrentTimeGreater,
  isMarketClosed,
  readJsonFile,
  writeJsonFile,
} from './functions';
import { Response } from 'express';
import {
  ISmartApiData,
  JsonFileStructure,
  Position,
  TradeDetails,
} from '../app.interface';
import {
  ALGO,
  DELAY,
  GET_LTP_DATA_API,
  GET_MARGIN,
  GET_POSITIONS,
  ME,
  MESSAGE_NOT_TAKE_TRADE,
  MTMDATATHRESHOLD,
  ORDER_API,
  SCRIPMASTER,
  STRIKE_DIFFERENCE,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
} from './constants';
dotenv.config();
type getLtpDataType = {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
};
export const getLtpData = async ({
  exchange,
  tradingsymbol,
  symboltoken,
}: getLtpDataType): Promise<object> => {
  const smartApiData: ISmartApiData = await generateSmartSession();
  const jwtToken = get(smartApiData, 'jwtToken');
  const data = JSON.stringify({ exchange, tradingsymbol, symboltoken });
  const config = {
    method: 'post',
    url: GET_LTP_DATA_API,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
      'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
      'X-MACAddress': 'MAC_ADDRESS',
      'X-PrivateKey': process.env.API_KEY,
    },
    data: data,
  };
  try {
    const response = await axios(config);
    return get(response, 'data.data', {}) || {};
  } catch (error) {
    console.log(`${ALGO}: the GET_LTP_DATA_API failed error below`);
    console.log(error);
    throw error;
  }
};
export const generateSmartSession = async (): Promise<ISmartApiData> => {
  const smart_api = new SmartAPI({
    api_key: process.env.API_KEY,
  });
  const TOTP = totp(process.env.CLIENT_TOTP_KEY);
  return smart_api
    .generateSession(process.env.CLIENT_CODE, process.env.CLIENT_PIN, TOTP)
    .then(async (response: object) => {
      return get(response, 'data');
    })
    .catch((ex: object) => {
      console.log(`${ALGO}: generateSmartSession failed error below`);
      console.log(ex);
      throw ex;
    });
};
export const fetchData = async (): Promise<object[]> => {
  return await axios
    .get(SCRIPMASTER)
    .then((response: object) => {
      let acData: object[] = get(response, 'data', []) || [];
      console.log(
        `${ALGO}: response if script master api loaded and its length is ${acData.length}`
      );
      let scripMaster = acData.map((element, index) => {
        return {
          ...element,
          label: get(element, 'name', 'NONAME') || 'NONAME',
          key: '0' + index + get(element, 'token', '00') || '00',
        };
      });
      return scripMaster;
    })
    .catch((evt: object) => {
      console.log(`${ALGO}: fetchData failed error below`);
      console.log(evt);
      throw evt;
    });
};
type getScripType = {
  scriptName: string;
  strikePrice?: string;
  optionType?: 'CE' | 'PE';
  expiryDate: string;
};
export const getScrip = async ({
  scriptName,
  strikePrice,
  optionType,
  expiryDate,
}: getScripType): Promise<object[]> => {
  let scripMaster: object[] = await fetchData();
  console.log(
    `${ALGO}:scriptName: ${scriptName}, is scrip master an array: ${isArray(
      scripMaster
    )}, its length is: ${scripMaster.length}`
  );
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    console.log(`${ALGO} all check cleared getScrip call`);
    let scrips = scripMaster.filter((scrip) => {
      const _scripName: string = get(scrip, 'name', '') || '';
      const _symbol: string = get(scrip, 'symbol', '') || '';
      const _expiry: string = get(scrip, 'expiry', '') || '';

      return (
        (_scripName.includes(scriptName) || _scripName === scriptName) &&
        get(scrip, 'exch_seg') === 'NFO' &&
        get(scrip, 'instrumenttype') === 'OPTIDX' &&
        (strikePrice === undefined || _symbol.includes(strikePrice)) &&
        (optionType === undefined || _symbol.includes(optionType)) &&
        _expiry === expiryDate
      );
    });
    scrips.sort(
      (curr: object, next: object) =>
        get(curr, 'token', 0) - get(next, 'token', 0)
    );
    scrips = scrips.map((element: object, index: number) => {
      return {
        ...element,
        label: get(element, 'name', 'NoName') || 'NoName',
        key: index,
      };
    });
    return scrips;
  } else {
    const errorMessage = `${ALGO}: getScrip failed`;
    console.log(errorMessage);
    throw errorMessage;
  }
};
export const getPositions = async () => {
  await delay({ milliSeconds: DELAY });
  const smartApiData: ISmartApiData = await generateSmartSession();
  const jwtToken = get(smartApiData, 'jwtToken');
  let config = {
    method: 'get',
    url: GET_POSITIONS,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
      'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
      'X-MACAddress': 'MAC_ADDRESS',
      'X-PrivateKey': process.env.API_KEY,
    },
    data: '',
  };
  return axios(config)
    .then(function (response: object) {
      return get(response, 'data');
    })
    .catch(function (error: object) {
      const errorMessage = `${ALGO}: getPositions failed error below`;
      console.log(errorMessage);
      console.log(error);
      throw error;
    });
};
type doOrderType = {
  tradingsymbol: string;
  symboltoken: string;
  transactionType: string | undefined;
};
type doOrderResponse = {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    script: string;
    orderid: string;
  };
};
export const doOrder = async ({
  tradingsymbol,
  transactionType,
  symboltoken,
}: doOrderType): Promise<doOrderResponse> => {
  const smartApiData: ISmartApiData = await generateSmartSession();
  const jwtToken = get(smartApiData, 'jwtToken');
  let data = JSON.stringify({
    exchange: 'NFO',
    tradingsymbol,
    symboltoken,
    quantity: 15,
    disclosedquantity: 15,
    transactiontype: transactionType,
    ordertype: 'MARKET',
    variety: 'NORMAL',
    producttype: 'CARRYFORWARD',
    duration: 'DAY',
  });
  let config = {
    method: 'post',
    url: ORDER_API,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
      'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
      'X-MACAddress': 'MAC_ADDRESS',
      'X-PrivateKey': process.env.API_KEY,
    },
    data: data,
  };
  return axios(config)
    .then((response: Response) => {
      return get(response, 'data');
    })
    .catch(function (error: Response) {
      const errorMessage = `${ALGO}: doOrder failed error below`;
      console.log(errorMessage);
      console.log(error);
      throw error;
    });
};
export const calculateMtm = async ({ data }: { data: JsonFileStructure }) => {
  const currentPositions = await getPositions();
  const currentPositionsData: object[] = get(currentPositions, 'data');
  let mtm = 0;
  currentPositionsData.forEach((value) => {
    data.tradeDetails.forEach((trade) => {
      if (trade && trade.token === get(value, 'symboltoken', '')) {
        mtm += parseInt(get(value, 'unrealised', ''));
      }
    });
  });
  return mtm;
};
export const shortStraddle = async () => {
  try {
    //GET ATM STIKE PRICE
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice();
    //GET CURRENT EXPIRY
    const expiryDate = getNextExpiry();
    //GET CALL DATA
    await delay({ milliSeconds: DELAY });
    const ceToken = await getScrip({
      scriptName: 'BANKNIFTY',
      expiryDate: expiryDate,
      optionType: 'CE',
      strikePrice: atmStrike.toString(),
    });
    //GET PUT DATA
    await delay({ milliSeconds: DELAY });
    const peToken = await getScrip({
      scriptName: 'BANKNIFTY',
      expiryDate: expiryDate,
      optionType: 'PE',
      strikePrice: atmStrike.toString(),
    });
    await delay({ milliSeconds: DELAY });
    const ceOrderData = await doOrder({
      tradingsymbol: get(ceToken, '0.symbol', ''),
      symboltoken: get(ceToken, '0.token', ''),
      transactionType: TRANSACTION_TYPE_SELL,
    });
    await delay({ milliSeconds: DELAY });
    const peOrderData = await doOrder({
      tradingsymbol: get(peToken, '0.symbol', ''),
      symboltoken: get(peToken, '0.token', ''),
      transactionType: TRANSACTION_TYPE_SELL,
    });
    return {
      stikePrice: atmStrike.toString(),
      expiryDate: expiryDate,
      netQty: '-15',
      ceOrderToken: get(ceToken, '0.token', ''),
      peOrderToken: get(peToken, '0.token', ''),
      ceOrderSymbol: get(ceToken, '0.symbol', ''),
      peOrderSymbol: get(peToken, '0.symbol', ''),
      ceOrderStatus: ceOrderData.status,
      peOrderStatus: peOrderData.status,
    };
  } catch (error) {
    const errorMessage = `${ALGO}: shortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const getMarginDetails = async () => {
  const smartApiData: ISmartApiData = await generateSmartSession();
  const jwtToken = get(smartApiData, 'jwtToken');
  const config = {
    method: 'get',
    url: GET_MARGIN,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
      'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
      'X-MACAddress': 'MAC_ADDRESS',
      'X-PrivateKey': process.env.API_KEY,
    },
  };
  return axios(config)
    .then((response: Response) => {
      return get(response, 'data');
    })
    .catch(function (error: Response) {
      const errorMessage = `${ALGO}: getMarginDetails failed error below`;
      console.log(errorMessage);
      console.log(error);
      throw error;
    });
};
export const repeatShortStraddle = async (
  difference: number,
  atmStrike: number
) => {
  try {
    const data = readJsonFile();
    console.log(
      `${ALGO}: checking conditions\n1. if the difference is more or equal to than env const STRIKE_DIFFERENCE: ${
        difference >= STRIKE_DIFFERENCE
      }\n2. if this same strike is already traded: ${checkStrike(
        data.tradeDetails,
        atmStrike.toString()
      )}`
    );
    if (
      difference >= STRIKE_DIFFERENCE &&
      checkStrike(data.tradeDetails, atmStrike.toString()) === false
    ) {
      console.log(`${ALGO}: executing trade repeat ...`);
      const shortStraddleData = await shortStraddle();
      data.tradeDetails.push({
        optionType: 'CE',
        netQty: shortStraddleData.netQty,
        expireDate: shortStraddleData.expiryDate,
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.ceOrderToken,
        symbol: shortStraddleData.ceOrderSymbol,
        closed: false,
        isAlgoCreatedPosition: true,
      });
      data.tradeDetails.push({
        optionType: 'PE',
        netQty: shortStraddleData.netQty,
        expireDate: shortStraddleData.expiryDate,
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.peOrderToken,
        symbol: shortStraddleData.peOrderSymbol,
        closed: false,
        isAlgoCreatedPosition: true,
      });
      console.log(`${ALGO}: details: `);
      console.log(data.tradeDetails);
      await writeJsonFile(data);
    }
  } catch (error) {
    const errorMessage = `${ALGO}: repeatShortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const getPositionsJson = async () => {
  try {
    const currentPositions = await getPositions();
    const positions: Position[] = get(currentPositions, 'data', []) || [];
    const openPositions = getOpenPositions(positions);
    console.log(
      `${ALGO}: currentPositions fetch successfully, currently total open positions are ${openPositions.length}`
    );
    const json = await createJsonFile();
    const tradeDetails = json.tradeDetails;
    for (const position of openPositions) {
      const isTradeExists = await checkPositionAlreadyExists({ position });
      if (isTradeExists === false) {
        const trade: TradeDetails = {
          netQty: position.netqty,
          optionType: position.optiontype,
          expireDate: position.expirydate,
          strike: position.strikeprice,
          symbol: position.symbolname,
          token: position.symboltoken,
          closed: false,
          isAlgoCreatedPosition: false,
        };
        tradeDetails.push(trade);
      }
    }
    await writeJsonFile(json);
    return json;
  } catch (error) {
    const errorMessage = `${ALGO}: getPositionsJson failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const closeAllTrades = async () => {
  try {
    await delay({ milliSeconds: DELAY });
    const data = readJsonFile();
    await delay({ milliSeconds: DELAY });
    const tradeDetails = data.tradeDetails;
    const closeTrade = async ({ trade }: { trade: TradeDetails }) => {
      try {
        if (trade.isAlgoCreatedPosition) {
          await delay({ milliSeconds: DELAY });
          const transactionStatus = await doOrder({
            tradingsymbol: trade.symbol,
            transactionType: TRANSACTION_TYPE_BUY,
            symboltoken: trade.token,
          });
          trade.closed = transactionStatus.status;
        }
      } catch (error) {
        const errorMessage = `${ALGO}: closeTrade failed error below`;
        console.log(errorMessage);
        console.log(error);
        throw error;
      }
    };
    if (Array.isArray(tradeDetails)) {
      for (const trade of tradeDetails) {
        await closeTrade({ trade });
      }
      await delay({ milliSeconds: DELAY });
      await writeJsonFile(data);
    }
  } catch (error) {
    const errorMessage = `${ALGO}: closeAllTrades failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const closeTrade = async () => {
  console.log(`${ME}: check if all the trades are closed.`);
  while ((await areAllTradesClosed()) === false) {
    console.log(`${ALGO}: all trades are not closed, closing trades...`);
    await closeAllTrades();
  }
  console.log(`${ALGO}: Yes, all the trades are closed.`);
  await delay({ milliSeconds: DELAY });
  const data = readJsonFile();
  data.isTradeClosed = true;
  await delay({ milliSeconds: DELAY });
  await writeJsonFile(data);
};
export const areAllTradesClosed = async () => {
  console.log(`${ALGO}: checking if all the trades are closed.`);
  await delay({ milliSeconds: DELAY });
  const data = readJsonFile();
  await delay({ milliSeconds: DELAY });
  const tradeDetails = data.tradeDetails;
  if (Array.isArray(tradeDetails)) {
    for (const trade of tradeDetails) {
      if (trade.closed === false) {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }
};
export const checkToRepeatShortStraddle = async (
  atmStrike: number,
  previousTradeStrikePrice: number
) => {
  console.log(
    `${ALGO}: atm strike price is ${atmStrike}. previous traded strike price is ${previousTradeStrikePrice}`
  );
  if (atmStrike > previousTradeStrikePrice) {
    const difference = atmStrike - previousTradeStrikePrice;
    console.log(
      `${ALGO}: atm strike is greater than previous traded strike price. The difference is ${difference}`
    );
    await delay({ milliSeconds: DELAY });
    await repeatShortStraddle(difference, atmStrike);
  } else if (atmStrike < previousTradeStrikePrice) {
    const difference = previousTradeStrikePrice - atmStrike;
    console.log(
      `${ALGO}: atm strike is lesser than previous traded strike price. The difference is ${difference}`
    );
    await delay({ milliSeconds: DELAY });
    await repeatShortStraddle(difference, atmStrike);
  }
};
export const executeTrade = async () => {
  let data = readJsonFile();
  if (!data.isTradeExecuted) {
    console.log(`${ALGO}: executing trade`);
    const shortStraddleData = await shortStraddle();
    if (shortStraddleData.ceOrderStatus && shortStraddleData.peOrderStatus) {
      data.isTradeExecuted = true;
      data.isTradeClosed = false;
      data.tradeDetails.push({
        optionType: 'CE',
        netQty: shortStraddleData.netQty,
        expireDate: shortStraddleData.expiryDate,
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.ceOrderToken,
        symbol: shortStraddleData.ceOrderSymbol,
        closed: false,
        isAlgoCreatedPosition: true,
      });
      data.tradeDetails.push({
        optionType: 'PE',
        netQty: shortStraddleData.netQty,
        expireDate: shortStraddleData.expiryDate,
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.peOrderToken,
        symbol: shortStraddleData.peOrderSymbol,
        closed: false,
        isAlgoCreatedPosition: true,
      });
      await writeJsonFile(data);
    }
  } else {
    console.log(
      `${ALGO}: trade executed already checking conditions to repeat the trade`
    );
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice();
    const no_of_trades = data.tradeDetails.length;
    const previousTradeStrikePrice = get(
      data,
      `tradeDetails.${no_of_trades - 1}.call.strike`,
      ''
    );
    console.log(
      `${ALGO}: atmStrike is ${atmStrike}, no of trades taken are ${no_of_trades}, previously traded  strike price is ${previousTradeStrikePrice}`
    );
    checkToRepeatShortStraddle(atmStrike, parseInt(previousTradeStrikePrice));
  }
  console.log(`${ALGO}: calculating mtm...`);
  await delay({ milliSeconds: DELAY });
  let mtmData = await calculateMtm({ data: readJsonFile() });
  console.log(`${ALGO}: mtm: ${mtmData}`);
  await delay({ milliSeconds: DELAY });
  const istTz = new Date().toLocaleString('default', {
    timeZone: 'Asia/Kolkata',
  });
  data = readJsonFile();
  const mtm = data.mtm;
  mtm.push({ time: istTz, value: mtmData.toString() });
  await delay({ milliSeconds: DELAY });
  await writeJsonFile(data);
  await delay({ milliSeconds: DELAY });
  await getPositionsJson();
  const closingTime: TimeComparisonType = { hours: 15, minutes: 15 };
  console.log(
    `${ALGO}: checking condition hasTimePassed15:15: ${isCurrentTimeGreater(
      closingTime
    )}`
  );
  if (mtmData < -MTMDATATHRESHOLD || isCurrentTimeGreater(closingTime)) {
    console.log(`${ALGO}: closing the trade`);
    await closeTrade();
    return '${ALGO}: Trade Closed';
  } else {
    console.log(`${ALGO}: returning mtm to api response`);
    return mtmData;
  }
};
const isTradeAllowed = (data: JsonFileStructure) => {
  console.log(
    `${ALGO}: checking conditions, isMarketClosed: ${isMarketClosed()}, hasTimePassed 09:45am: ${isCurrentTimeGreater(
      { hours: 9, minutes: 45 }
    )}, isTradeClosed: ${data.isTradeClosed}`
  );
  return (
    !isMarketClosed() &&
    isCurrentTimeGreater({ hours: 9, minutes: 45 }) &&
    !data.isTradeClosed
  );
};
export const checkMarketConditionsAndExecuteTrade = async () => {
  let data = await createJsonFile();
  if (isTradeAllowed(data)) {
    try {
      return await executeTrade();
    } catch (err) {
      return err;
    }
  } else {
    return MESSAGE_NOT_TAKE_TRADE;
  }
};
type CheckPosition = { position: Position };
export const checkPositionAlreadyExists = async ({
  position,
}: CheckPosition) => {
  try {
    await delay({ milliSeconds: DELAY });
    const data = await createJsonFile();
    const trades = data.tradeDetails;
    for (const trade of trades) {
      if (trade.strike === position.strikeprice) return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};
