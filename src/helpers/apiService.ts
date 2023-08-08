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
import { ISmartApiData, JsonFileStructure, Position } from '../app.interface';
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

  return axios(config).then((response: object) => {
    return get(response, 'data.data', {}) || {};
  });
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
      return ex;
    });
};
export const fetchData = async (): Promise<object> => {
  return await axios
    .get(SCRIPMASTER)
    .then((response: object) => {
      let acData: object[] = get(response, 'data', []) || [];
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
      return evt;
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
  let scripMaster = await fetchData();
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    let scrips = scripMaster.filter((scrip) => {
      const _scripName: string = get(scrip, 'name', '') || '';
      const _symbol: string = get(scrip, 'symbol', '') || '';
      const _expiry: string = get(scrip, 'expiry', '') || '';

      return (
        (_scripName.includes(scriptName) || _scripName === scriptName) &&
        get(scrip, 'exch_seg', '') === 'NFO' &&
        get(scrip, 'instrumenttype', '') === 'OPTIDX' &&
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
    return [{ message: 'pending' }];
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
      return error;
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
      return error;
    });
};
export const calculateMtm = async ({ data }: { data: JsonFileStructure }) => {
  const currentPositions = await getPositions();
  const currentPositionsData: object[] = get(currentPositions, 'data');
  let mtm = 0;
  currentPositionsData.forEach((value) => {
    data.tradeDetails.forEach((trade) => {
      if (
        (trade.call && trade.call.token === get(value, 'symboltoken', '')) ||
        (trade.put && trade.put.token === get(value, 'symboltoken', ''))
      ) {
        mtm += parseInt(get(value, 'unrealised', ''));
      }
    });
  });
  return mtm;
};
export const shortStraddle = async () => {
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
    ceOrderToken: get(ceToken, '0.token', ''),
    peOrderToken: get(peToken, '0.token', ''),
    ceOrderSymbol: get(ceToken, '0.symbol', ''),
    peOrderSymbol: get(peToken, '0.symbol', ''),
    ceOrderStatus: ceOrderData.status,
    peOrderStatus: peOrderData.status,
  };
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
      return error;
    });
};
export const repeatShortStraddle = async (
  difference: number,
  atmStrike: number
) => {
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
      call: {
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.ceOrderToken,
        symbol: shortStraddleData.ceOrderSymbol,
        closed: false,
        isAlgoCreatedPosition: true,
      },
      put: {
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.peOrderToken,
        symbol: shortStraddleData.peOrderSymbol,
        closed: false,
        isAlgoCreatedPosition: true,
      },
    });
    console.log(`${ALGO}: details: `);
    console.log(data.tradeDetails);
    writeJsonFile(data);
  }
};
export const getPositionsJson = async () => {
  try {
    const currentPositions = await getPositions();
    const positions: Position[] = get(currentPositions, 'data', []) || [];
    const openPositions = getOpenPositions(positions);
    const json = createJsonFile();
    const tradeDetails = json.tradeDetails;
    for (const position of openPositions) {
      const isTradeExists = await checkPositionAlreadyExists({ position });
      if (isTradeExists === false) {
        if (position.optiontype === 'CE') {
          tradeDetails.push({
            call: {
              strike: position.strikeprice,
              symbol: position.symbolname,
              token: position.symboltoken,
              closed: false,
              isAlgoCreatedPosition: false,
            },
          });
        } else {
          tradeDetails.push({
            put: {
              strike: position.strikeprice,
              symbol: position.symbolname,
              token: position.symboltoken,
              closed: false,
              isAlgoCreatedPosition: false,
            },
          });
        }
      }
    }
    writeJsonFile(json);
    return json;
  } catch (err) {
    return err;
  }
};
export const closeAllTrades = async () => {
  await delay({ milliSeconds: DELAY });
  const data = readJsonFile();
  await delay({ milliSeconds: DELAY });
  const tradeDetails = data.tradeDetails;
  if (Array.isArray(tradeDetails)) {
    for (const trade of tradeDetails) {
      if (
        trade?.call?.isAlgoCreatedPosition ||
        trade?.put?.isAlgoCreatedPosition
      ) {
        await delay({ milliSeconds: DELAY });
        const callStatus = await doOrder({
          tradingsymbol: get(trade, 'call.symbol', ''),
          transactionType: TRANSACTION_TYPE_BUY,
          symboltoken: get(trade, 'call.token', ''),
        });
        await delay({ milliSeconds: DELAY });
        const putStatus = await doOrder({
          tradingsymbol: get(trade, 'put.symbol', ''),
          transactionType: TRANSACTION_TYPE_BUY,
          symboltoken: get(trade, 'put.token', ''),
        });
        if (trade.call) {
          trade.call.closed = callStatus.status;
        }
        if (trade.put) {
          trade.put.closed = putStatus.status;
        }
      }
    }
    await delay({ milliSeconds: DELAY });
    writeJsonFile(data);
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
  writeJsonFile(data);
};
export const areAllTradesClosed = async () => {
  console.log(`${ALGO}: checking if all the trades are closed.`);
  await delay({ milliSeconds: DELAY });
  const data = readJsonFile();
  await delay({ milliSeconds: DELAY });
  const tradeDetails = data.tradeDetails;
  if (Array.isArray(tradeDetails)) {
    for (const trade of tradeDetails) {
      if (
        (trade.call && !trade.call.closed) ||
        (trade.put && !trade.put.closed)
      ) {
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
        call: {
          strike: shortStraddleData.stikePrice,
          token: shortStraddleData.ceOrderToken,
          symbol: shortStraddleData.ceOrderSymbol,
          closed: false,
          isAlgoCreatedPosition: true,
        },
        put: {
          strike: shortStraddleData.stikePrice,
          token: shortStraddleData.peOrderToken,
          symbol: shortStraddleData.peOrderSymbol,
          closed: false,
          isAlgoCreatedPosition: true,
        },
      });
      writeJsonFile(data);
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
  writeJsonFile(data);
  // await delay({ milliSeconds: DELAY });
  // await getPositionsJson();
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
  let data = createJsonFile();
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
    const trades = createJsonFile().tradeDetails;
    for (const trade of trades) {
      if (trade.call?.strike === position.strikeprice) return true;
      if (trade.put?.strike === position.strikeprice) return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};
