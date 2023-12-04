import { get, isArray, isEmpty } from 'lodash';
let { SmartAPI } = require('smartapi-javascript');
const axios = require('axios');
const totp = require('totp-generator');
import {
  areBothOptionTypesPresentForStrike,
  checkStrike,
  createJsonFile,
  delay,
  getAtmStrikePrice,
  getCurrentTimeAndPastTime,
  getLastThursdayOfCurrentMonth,
  getNearestStrike,
  getNextExpiry,
  getOpenPositions,
  isCurrentTimeGreater,
  isMarketClosed,
  readJsonFile,
  removeJsonFile,
  roundToNearestHundred,
  setSmartSession,
  writeJsonFile,
} from './functions';
import { Response } from 'express';
import {
  AddShortStraddleData,
  BothPresent,
  CheckOptionType,
  CheckPosition,
  HistoryInterface,
  HistoryInterval,
  ISmartApiData,
  JsonFileStructure,
  LtpDataType,
  OptionType,
  OrderData,
  Position,
  Strategy,
  TimeComparisonType,
  TradeDetails,
  checkPositionToCloseType,
  doOrderResponse,
  doOrderType,
  getLtpDataType,
  getPositionByTokenType,
  getScripFutType,
  getScripType,
  scripMasterResponse,
  shouldCloseTradeType,
} from '../app.interface';
import {
  ALGO,
  DELAY,
  GET_LTP_DATA_API,
  GET_MARGIN,
  GET_POSITIONS,
  HISTORIC_API,
  ME,
  MESSAGE_NOT_TAKE_TRADE,
  ORDER_API,
  SCRIPMASTER,
  SHORT_DELAY,
  STRIKE_DIFFERENCE,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
} from './constants';
import DataStore from '../store/dataStore';
import SmartSession from '../store/smartSession';
import moment from 'moment-timezone';
import { findTrade, makeNewTrade } from './dbService';
import OrderStore from '../store/orderStore';
import ScripMasterStore from '../store/scripMasterStore';
const tulind = require('tulind');
export const getLtpData = async ({
  exchange,
  tradingsymbol,
  symboltoken,
}: getLtpDataType): Promise<LtpDataType> => {
  const smartInstance = SmartSession.getInstance();
  await delay({ milliSeconds: DELAY });
  const smartApiData: ISmartApiData = smartInstance.getPostData();
  const jwtToken = get(smartApiData, 'jwtToken');
  const data = JSON.stringify({ exchange, tradingsymbol, symboltoken });
  const cred = DataStore.getInstance().getPostData();
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
      'X-PrivateKey': cred.APIKEY,
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
  const cred = DataStore.getInstance().getPostData();
  const smart_api = new SmartAPI({
    api_key: cred.APIKEY,
  });
  const TOTP = totp(cred.CLIENT_TOTP_PIN);
  return smart_api
    .generateSession(cred.CLIENT_CODE, cred.CLIENT_PIN, TOTP)
    .then(async (response: object) => {
      return get(response, 'data');
    })
    .catch((ex: object) => {
      console.log(`${ALGO}: generateSmartSession failed error below`);
      console.log(ex);
      throw ex;
    });
};
export const fetchData = async (): Promise<scripMasterResponse[]> => {
  const data = ScripMasterStore.getInstance().getPostData().SCRIP_MASTER_JSON;
  if (data.length > 0) {
    return data as scripMasterResponse[];
  } else {
    return await axios
      .get(SCRIPMASTER)
      .then((response: object) => {
        let acData: scripMasterResponse[] = get(response, 'data', []) || [];
        console.log(
          `${ALGO}: response if script master api loaded and its length is ${acData.length}`
        );
        ScripMasterStore.getInstance().setPostData({
          SCRIP_MASTER_JSON: acData,
        });
        return acData;
      })
      .catch((evt: object) => {
        console.log(`${ALGO}: fetchData failed error below`);
        console.log(evt);
        throw evt;
      });
  }
};
export const getAllFut = async () => {
  let scripMaster: scripMasterResponse[] = await fetchData();
  console.log(
    `${ALGO}: Scrip master an array: ${isArray(scripMaster)}, its length is: ${
      scripMaster.length
    }`
  );
  if (isArray(scripMaster) && scripMaster.length > 0) {
    console.log(`${ALGO} all check cleared getScrip call`);
    const _expiry: string = getLastThursdayOfCurrentMonth();
    let filteredScrips = scripMaster.filter((scrip) => {
      return (
        get(scrip, 'exch_seg') === 'NFO' &&
        get(scrip, 'instrumenttype') === 'FUTSTK' &&
        parseInt(get(scrip, 'lotsize')) < 51 &&
        get(scrip, 'expiry') === _expiry
      );
    });
    console.log(`${ALGO}: filteredScrips.length: ${filteredScrips.length}`);
    if (filteredScrips.length > 0) return filteredScrips;
    else throw new Error('some error occurred');
  } else {
    throw new Error('some error occurred');
  }
};
export const getScripFut = async ({ scriptName }: getScripFutType) => {
  let scripMaster: scripMasterResponse[] = await fetchData();
  console.log(
    `${ALGO}:scriptName: ${scriptName}, is scrip master an array: ${isArray(
      scripMaster
    )}, its length is: ${scripMaster.length}`
  );
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    console.log(`${ALGO} all check cleared getScrip call`);
    console.log(`${ALGO}: expiry: ${getLastThursdayOfCurrentMonth()}`);
    let filteredScrip = scripMaster.filter((scrip) => {
      const _scripName: string = get(scrip, 'name', '') || '';
      const _expiry: string = getLastThursdayOfCurrentMonth();
      return (
        (_scripName.includes(scriptName) || _scripName === scriptName) &&
        get(scrip, 'exch_seg') === 'NFO' &&
        (get(scrip, 'instrumenttype') === 'FUTSTK' ||
          get(scrip, 'instrumenttype') === 'FUTIDX') &&
        get(scrip, 'expiry') === _expiry
      );
    });
    if (filteredScrip.length === 1) return filteredScrip[0];
    else throw new Error('scrip not found');
  } else {
    throw new Error('scrip not found');
  }
};
export const getScrip = async ({
  scriptName,
  strikePrice,
  optionType,
  expiryDate,
}: getScripType): Promise<scripMasterResponse[]> => {
  let scripMaster: scripMasterResponse[] = await fetchData();
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
        exch_seg: get(element, 'exch_seg', '') || '',
        expiry: get(element, 'expiry', '') || '',
        instrumenttype: get(element, 'instrumenttype', '') || '',
        lotsize: get(element, 'lotsize', '') || '',
        name: get(element, 'name', '') || '',
        strike: get(element, 'strike', '') || '',
        symbol: get(element, 'symbol', '') || '',
        tick_size: get(element, 'tick_size', '') || '',
        token: get(element, 'token', '') || '',
      };
    });
    return scrips;
  } else {
    const errorMessage = `${ALGO}: getScrip failed`;
    console.log(errorMessage);
    throw errorMessage;
  }
};
export const getIndexScrip = async ({
  scriptName,
}: {
  scriptName: string;
}): Promise<scripMasterResponse[]> => {
  let scripMaster: scripMasterResponse[] = await fetchData();
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    let scrips = scripMaster.filter((scrip) => {
      const _scripName: string = get(scrip, 'name', '') || '';
      return (
        (_scripName.includes(scriptName) || _scripName === scriptName) &&
        get(scrip, 'exch_seg') === 'NSE' &&
        get(scrip, 'instrumenttype') === 'AMXIDX'
      );
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
  const smartInstance = SmartSession.getInstance();
  await delay({ milliSeconds: DELAY });
  const smartApiData: ISmartApiData = smartInstance.getPostData();
  const jwtToken = get(smartApiData, 'jwtToken');
  const cred = DataStore.getInstance().getPostData();
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
      'X-PrivateKey': cred.APIKEY,
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
export const getHistoricPrices = async (data: HistoryInterface) => {
  const smartInstance = SmartSession.getInstance();
  await delay({ milliSeconds: DELAY });
  const smartApiData: ISmartApiData = smartInstance.getPostData();
  const jwtToken = get(smartApiData, 'jwtToken');
  const cred = DataStore.getInstance().getPostData();
  const payload = JSON.stringify({
    exchange: data.exchange,
    symboltoken: data.symboltoken,
    interval: data.interval,
    fromdate: data.fromdate,
    todate: data.todate,
  });
  let config = {
    method: 'post',
    url: HISTORIC_API,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
      'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
      'X-MACAddress': 'MAC_ADDRESS',
      'X-PrivateKey': cred.APIKEY,
    },
    data: payload,
  };
  return await axios(config)
    .then(function (response: any) {
      return get(response, 'data.data');
    })
    .catch(function (error: any) {
      return error;
    });
};
export const doOrder = async ({
  tradingsymbol,
  transactionType,
  symboltoken,
  productType = 'CARRYFORWARD',
}: doOrderType): Promise<doOrderResponse> => {
  const smartInstance = SmartSession.getInstance();
  await delay({ milliSeconds: DELAY });
  const smartApiData: ISmartApiData = smartInstance.getPostData();
  const jwtToken = get(smartApiData, 'jwtToken');
  const orderStoreData = OrderStore.getInstance().getPostData();
  const quantity = 15 * orderStoreData.QUANTITY;
  let data = JSON.stringify({
    exchange: 'NFO',
    tradingsymbol,
    symboltoken,
    quantity: quantity,
    disclosedquantity: quantity,
    transactiontype: transactionType,
    ordertype: 'MARKET',
    variety: 'NORMAL',
    producttype: productType,
    duration: 'DAY',
  });
  console.log(`${ALGO} doOrder data `, data);
  const cred = DataStore.getInstance().getPostData();
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
      'X-PrivateKey': cred.APIKEY,
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
  const expiryDate = getNextExpiry();
  currentPositionsData.forEach((value) => {
    data.tradeDetails.forEach((trade) => {
      if (
        trade &&
        trade.token === get(value, 'symboltoken', '') &&
        trade.expireDate === expiryDate
      ) {
        const unrealised = get(value, 'unrealised', '');
        mtm += parseInt(unrealised);
      }
    });
  });
  return mtm;
};
export const doOrderByStrike = async (
  strike: number,
  optionType: OptionType,
  transactionType: 'BUY' | 'SELL'
): Promise<OrderData> => {
  try {
    const expiryDate = getNextExpiry();
    console.log(
      `${ALGO} {doOrderByStrike}: stike: ${strike}, expiryDate: ${expiryDate}`
    );
    await delay({ milliSeconds: DELAY });
    const token = await getScrip({
      scriptName: 'BANKNIFTY',
      expiryDate: expiryDate,
      optionType: optionType,
      strikePrice: strike.toString(),
    });
    //console.log(`${ALGO} {doOrderByStrike}: token: `, token);
    await delay({ milliSeconds: DELAY });
    const orderData = await doOrder({
      tradingsymbol: get(token, '0.symbol', ''),
      symboltoken: get(token, '0.token', ''),
      transactionType: transactionType,
    });
    console.log(`${ALGO} {doOrderByStrike}: order status: `, orderData.status);
    const lots = OrderStore.getInstance().getPostData().QUANTITY;
    const qty = 15 * lots;
    const netQty = transactionType === 'SELL' ? qty * -1 : qty;
    return {
      stikePrice: strike.toString(),
      expiryDate: expiryDate,
      netQty: netQty.toString(),
      token: get(token, '0.token', ''),
      symbol: get(token, '0.symbol', ''),
      exchange: get(token, '0.exch_seg', ''),
      status: orderData.status,
    };
  } catch (error) {
    const errorMessage = `${ALGO}: doOrderByStrike failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const shortStraddle = async () => {
  try {
    //GET ATM STIKE PRICE
    const atmStrike = await getAtmStrikePrice();
    let order = await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
    await addOrderData(readJsonFile(), order, OptionType.CE);
    order = await doOrderByStrike(atmStrike + 1000, OptionType.CE, 'BUY');
    await addOrderData(readJsonFile(), order, OptionType.CE);
    order = await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
    await addOrderData(readJsonFile(), order, OptionType.PE);
    order = await doOrderByStrike(atmStrike - 1000, OptionType.PE, 'BUY');
    await addOrderData(readJsonFile(), order, OptionType.PE);
  } catch (error) {
    const errorMessage = `${ALGO}: shortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const getMarginDetails = async () => {
  const smartInstance = SmartSession.getInstance();
  await delay({ milliSeconds: DELAY });
  const smartApiData: ISmartApiData = smartInstance.getPostData();
  const jwtToken = get(smartApiData, 'jwtToken');
  const cred = DataStore.getInstance().getPostData();
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
      'X-PrivateKey': cred.APIKEY,
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
export const checkBoth_CE_PE_Present = (data: BothPresent) => {
  if (data.ce && data.pe) return CheckOptionType.BOTH_CE_PE_PRESENT;
  else if (!data.ce && !data.pe) return CheckOptionType.BOTH_CE_PE_NOT_PRESENT;
  else if (!data.ce && data.pe) return CheckOptionType.ONLY_PE_PRESENT;
  else return CheckOptionType.ONLY_CE_PRESENT;
};
export const repeatShortStraddle = async (
  difference: number,
  atmStrike: number
) => {
  try {
    const data = readJsonFile();
    const strikeDiff = STRIKE_DIFFERENCE;
    const isSameStrikeAlreadyTraded = checkStrike(
      data.tradeDetails,
      atmStrike.toString()
    );
    console.log(
      `${ALGO}: checking conditions\n1. if the difference is more or equal to than env const STRIKE_DIFFERENCE (${strikeDiff}): ${
        difference >= strikeDiff
      }\n2. if this same strike is already traded: ${isSameStrikeAlreadyTraded}`
    );
    const result = areBothOptionTypesPresentForStrike(
      data.tradeDetails,
      atmStrike.toString()
    );
    console.log(`${ALGO}: areBothOptionTypesPresentForStrike: `, result);
    const cepe_present = checkBoth_CE_PE_Present(result);
    if (difference >= strikeDiff && isSameStrikeAlreadyTraded === false) {
      console.log(`${ALGO}: executing trade repeat ...`);
      if (cepe_present === CheckOptionType.BOTH_CE_PE_NOT_PRESENT) {
        await shortStraddle();
      } else if (cepe_present === CheckOptionType.ONLY_CE_PRESENT) {
        let orderData = await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
        addOrderData(data, orderData, OptionType.PE);
        orderData = await doOrderByStrike(
          atmStrike - 1000,
          OptionType.PE,
          'BUY'
        );
        addOrderData(data, orderData, OptionType.PE);
      } else if (cepe_present === CheckOptionType.ONLY_PE_PRESENT) {
        let orderData = await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
        addOrderData(data, orderData, OptionType.CE);
        orderData = await doOrderByStrike(
          atmStrike + 1000,
          OptionType.CE,
          'BUY'
        );
        addOrderData(data, orderData, OptionType.CE);
      }
    }
  } catch (error) {
    const errorMessage = `${ALGO}: repeatShortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const getPositionByToken = ({
  positions,
  token,
}: getPositionByTokenType) => {
  for (const position of positions) {
    if (position.symboltoken === token) {
      return position;
    }
  }
  return null;
};
export const shouldCloseTrade = async ({
  ltp,
  avg,
  trade,
}: shouldCloseTradeType) => {
  const doubledPrice = avg * 2;
  console.log(
    `${ALGO}: checking shouldCloseTrade, ltp: ${ltp}, doubledPrice: ${doubledPrice}`
  );
  if (parseInt(trade.netQty) < 0 && ltp >= doubledPrice) {
    console.log(`${ALGO}: shouldCloseTrade true`);
    try {
      return await closeParticularTrade({ trade });
    } catch (error) {
      console.log(`${ALGO}: closeParticularTrade could not be called`);
      throw error;
    }
  }
};
export const checkPositionToClose = async ({
  openPositions,
}: checkPositionToCloseType) => {
  console.log(`${ALGO}, checkPositionToClose`);
  try {
    const data = readJsonFile();
    const tradeDetails = data.tradeDetails;
    for (const position of openPositions) {
      for (const trade of tradeDetails) {
        if (trade && trade.token === position.symboltoken) {
          trade.tradedPrice = parseInt(position.netprice);
          trade.exchange = position.exchange;
          trade.tradingSymbol = position.tradingsymbol;
        }
      }
    }
    for (const trade of tradeDetails) {
      if (
        trade &&
        trade.exchange === 'NFO' &&
        trade.tradingSymbol &&
        trade.tradedPrice
      ) {
        const currentLtpPrice = getPositionByToken({
          positions: openPositions,
          token: trade.token,
        })?.ltp;
        await shouldCloseTrade({
          ltp:
            typeof currentLtpPrice === 'string' ? parseInt(currentLtpPrice) : 0,
          avg: trade.tradedPrice,
          trade: trade,
        });
      }
    }
    await writeJsonFile(data);
  } catch (error) {
    const errorMessage = `${ALGO}: checkPositionToClose failed error below`;
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
    if (openPositions.length > 0) {
      json.isTradeExecuted = true;
    }
    const tradeDetails = json.tradeDetails;
    for (const position of openPositions) {
      const isTradeExists = await checkPositionAlreadyExists({
        position,
        trades: tradeDetails,
      });
      if (isTradeExists === false) {
        const trade: TradeDetails = {
          netQty: position.netqty,
          optionType: position.optiontype,
          expireDate: position.expirydate,
          strike: position.strikeprice,
          symbol: position.symbolname,
          token: position.symboltoken,
          closed: false,
          tradedPrice: parseInt(position.netprice),
          exchange: position.exchange,
          tradingSymbol: position.tradingsymbol,
        };
        tradeDetails.push(trade);
      }
    }
    await writeJsonFile(json);
    await checkPositionToClose({ openPositions });
    return json;
  } catch (error) {
    const errorMessage = `${ALGO}: getPositionsJson failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const closeParticularTrade = async ({
  trade,
}: {
  trade: TradeDetails;
}) => {
  try {
    await delay({ milliSeconds: DELAY });
    const qty = parseInt(trade.netQty);
    const transactionStatus = await doOrder({
      tradingsymbol: trade.tradingSymbol,
      transactionType: qty < 0 ? TRANSACTION_TYPE_BUY : TRANSACTION_TYPE_SELL,
      symboltoken: trade.token,
    });
    // console.log(`${ALGO} transactionStatus: `, transactionStatus);
    trade.closed = transactionStatus.status;
    return transactionStatus.status;
  } catch (error) {
    const errorMessage = `${ALGO}: closeTrade failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const closeAllTrades = async () => {
  try {
    await delay({ milliSeconds: DELAY });
    const data = readJsonFile();
    console.log(`${ALGO}: closeAllTrades`);
    await delay({ milliSeconds: DELAY });
    const tradeDetails = data.tradeDetails;
    if (Array.isArray(tradeDetails)) {
      const nextExpiry = getNextExpiry();
      for (const trade of tradeDetails) {
        if (trade.expireDate === nextExpiry) {
          await closeParticularTrade({ trade });
        }
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
  console.log(
    `${ALGO}: {areAllTradesClosed} checking if all the trades are closed.`
  );
  await delay({ milliSeconds: DELAY });
  const data = readJsonFile();
  await delay({ milliSeconds: DELAY });
  const tradeDetails = data.tradeDetails;
  if (Array.isArray(tradeDetails)) {
    for (const trade of tradeDetails) {
      const isTradeClosed = trade.closed;
      const isExpiryMatch = trade.expireDate === getNextExpiry();
      if (isTradeClosed === false && isExpiryMatch) {
        return false;
      }
    }
  }
  return true;
};
export const checkToRepeatShortStraddle = async (
  atmStrike: number,
  previousTradeStrikePrice: number
) => {
  console.log(
    `${ALGO}: atm strike price is ${atmStrike}. previous traded strike price is ${previousTradeStrikePrice}`
  );
  if (isFinite(atmStrike)) {
    if (atmStrike > previousTradeStrikePrice) {
      const difference = atmStrike - previousTradeStrikePrice;
      console.log(
        `${ALGO}: atm strike is greater than previously traded strike price. The difference is ${difference}`
      );
      await delay({ milliSeconds: DELAY });
      await repeatShortStraddle(difference, atmStrike);
    } else if (atmStrike < previousTradeStrikePrice) {
      const difference = previousTradeStrikePrice - atmStrike;
      console.log(
        `${ALGO}: atm strike is lesser than previously traded strike price. The difference is ${difference}`
      );
      await delay({ milliSeconds: DELAY });
      await repeatShortStraddle(difference, atmStrike);
    } else {
      console.log(
        `${ALGO}: atm strike is equal to previously traded strike price`
      );
    }
  } else {
    console.log(`${ALGO}: Oops, 'atmStrike' is infinity! Stopping operations.`);
    throw new Error(`Oops, atmStrike is infinity! Stopping operations.`);
  }
};
export const addOrderData = async (
  data: JsonFileStructure,
  orderData: OrderData,
  optionType: OptionType
) => {
  if (orderData.status) {
    data.tradeDetails.push({
      optionType: optionType,
      netQty: orderData.netQty,
      expireDate: orderData.expiryDate,
      strike: orderData.stikePrice,
      token: orderData.token,
      symbol: orderData.symbol,
      closed: false,
      tradedPrice: 0,
      exchange: orderData.exchange,
      tradingSymbol: orderData.symbol,
    });
  }
  await writeJsonFile(data);
};
export const addShortStraddleData = async ({
  data,
  shortStraddleData,
}: AddShortStraddleData) => {
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
      tradedPrice: 0,
      exchange: '',
      tradingSymbol: '',
    });
    data.tradeDetails.push({
      optionType: 'PE',
      netQty: shortStraddleData.netQty,
      expireDate: shortStraddleData.expiryDate,
      strike: shortStraddleData.stikePrice,
      token: shortStraddleData.peOrderToken,
      symbol: shortStraddleData.peOrderSymbol,
      closed: false,
      tradedPrice: 0,
      exchange: '',
      tradingSymbol: '',
    });
    await writeJsonFile(data);
  }
};
const coreTradeExecution = async ({ data }: { data: JsonFileStructure }) => {
  if (!data.isTradeExecuted) {
    console.log(`${ALGO}: executing trade`);
    await shortStraddle();
  } else {
    console.log(
      `${ALGO}: trade executed already checking conditions to repeat the trade`
    );
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice();
    const no_of_trades = data.tradeDetails.length;
    const getAlgoTrades = data.tradeDetails;
    let previousTradeStrikePrice: string | number = getNearestStrike({
      algoTrades: getAlgoTrades,
      atmStrike: atmStrike,
    });
    console.log(
      `${ALGO}: atmStrike is ${atmStrike}, no of trades taken are ${no_of_trades}, previously traded  strike price is ${previousTradeStrikePrice}`
    );
    await checkToRepeatShortStraddle(atmStrike, previousTradeStrikePrice);
  }
  console.log(`${ALGO}: calculating mtm...`);
  await delay({ milliSeconds: DELAY });
  let mtmData = await calculateMtm({ data });
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
  return mtmData;
};
export const executeTrade = async () => {
  const closingTime: TimeComparisonType = { hours: 15, minutes: 15 };
  const isPastClosingTime = isCurrentTimeGreater(closingTime);
  let mtmData = 0;
  console.log(`${ALGO}: isPastClosingTime: ${isPastClosingTime}`);
  let data = await getPositionsJson();
  if (isPastClosingTime === false) mtmData = await coreTradeExecution({ data });
  // mtmData = await coreTradeExecution();
  const stoploss = OrderStore.getInstance().getPostData().STOPLOSS;
  const mtmThreshold = -stoploss;
  let resp: number | string = `${ALGO}: Trade Closed`;
  if (mtmData < mtmThreshold || isPastClosingTime) await closeTrade();
  else resp = mtmData;
  await removeJsonFile();
  return resp;
};
const isTradeAllowed = async (data: JsonFileStructure) => {
  const isMarketOpen = !isMarketClosed();
  const hasTimePassedToTakeTrade = isCurrentTimeGreater({
    hours: 9,
    minutes: 15,
  });
  const isTradeOpen = !data.isTradeClosed;
  let isSmartAPIWorking = false;
  try {
    const smartData = await generateSmartSession();
    isSmartAPIWorking = !isEmpty(smartData);
    if (isSmartAPIWorking) {
      setSmartSession(smartData);
    }
  } catch (err) {
    console.log('Error occurred for generateSmartSession');
  }
  console.log(
    `${ALGO}: checking conditions, isMarketOpen: ${isMarketOpen}, hasTimePassed 09:45am: ${hasTimePassedToTakeTrade}, isTradeOpen: ${isTradeOpen}, isSmartAPIWorking: ${isSmartAPIWorking}`
  );
  return (
    isMarketOpen && hasTimePassedToTakeTrade && isTradeOpen && isSmartAPIWorking
  );
};
export const checkMarketConditionsAndExecuteTrade = async (
  strategy: Strategy = Strategy.SHORTSTRADDLE,
  lots: number = 1,
  stoploss: number = 10000
) => {
  OrderStore.getInstance().setPostData({ QUANTITY: lots, STOPLOSS: stoploss });
  try {
    const data = await createJsonFile();
    // return await executeTrade();
    if (!(await isTradeAllowed(data))) {
      return MESSAGE_NOT_TAKE_TRADE;
    }
    if (strategy === Strategy.SHORTSTRADDLE) {
      return await executeTrade();
    } else if (strategy === Strategy.RSI) {
      return await runRsiAlgo();
    } else {
      return MESSAGE_NOT_TAKE_TRADE;
    }
  } catch (err) {
    return err;
  }
};
export const checkPositionAlreadyExists = async ({
  position,
  trades,
}: CheckPosition) => {
  for (const trade of trades) {
    if (
      parseInt(trade.strike) === parseInt(position.strikeprice) &&
      trade.optionType === position.optiontype
    )
      return true;
  }
  return false;
};
export const runRsiAlgo = async () => {
  const todaysTrade = await findTrade(Strategy.RSI);
  if (todaysTrade) {
    console.log(todaysTrade);
  } else {
    const scrip = await getScripFut({ scriptName: 'BANKNIFTY' });
    const data: HistoryInterface = {
      exchange: scrip.exch_seg,
      interval: HistoryInterval.FIVE_MINUTE,
      symboltoken: scrip.token,
      fromdate: getCurrentTimeAndPastTime().pastTime,
      todate: getCurrentTimeAndPastTime().currentTime,
    };
    await delay({ milliSeconds: SHORT_DELAY });
    const historicData = await getHistoricPrices(data);
    if (historicData && isArray(historicData)) {
      const closingPrices: number[] = historicData.map((d) => d[4]);
      return new Promise(async (resolve, reject) => {
        await tulind.indicators.rsi.indicator(
          [closingPrices],
          [14],
          async (err: object, res: any) => {
            if (err) {
              console.log(`${ALGO}: `, err);
              reject(err);
            }
            const calculatedRsi = res[0].slice(-1)[0];
            console.log(`${ALGO}: calculatedRsi: ${calculatedRsi}`);
            const ltp = await getLtpData({
              exchange: scrip.exch_seg,
              tradingsymbol: scrip.symbol,
              symboltoken: scrip.token,
            });
            console.log(`${ALGO}: ltp: ${ltp.ltp}`);
            if (calculatedRsi > 80) {
              const ltpPlus500 = roundToNearestHundred(ltp.ltp + 500);
              const optScrip = await getScrip({
                scriptName: scrip.name,
                strikePrice: ltpPlus500.toString(),
                optionType: 'CE',
                expiryDate: getNextExpiry(),
              });
              const orderDetails = await doOrder({
                tradingsymbol: optScrip[0].symbol,
                symboltoken: optScrip[0].token,
                transactionType: TRANSACTION_TYPE_SELL,
                productType: 'DELIVERY',
              });

              if (orderDetails.status) {
                let positionsResponse = await getPositions();
                let positionsData = get(positionsResponse, 'data', []) ?? [];
                let mtm = 0;
                if (Array.isArray(positionsData) && positionsData.length > 0) {
                  const position = positionsData.filter((position) => {
                    if (get(position, 'symboltoken') === scrip.token)
                      return position;
                  });
                  mtm = parseInt(get(position, 'unrealised', '0') ?? '0');
                }
                const istTz = new Date().toLocaleString('default', {
                  timeZone: 'Asia/Kolkata',
                });
                const json: JsonFileStructure = {
                  isTradeExecuted: true,
                  accountDetails: { capitalUsed: 0 },
                  isTradeClosed: false,
                  tradeDate: moment().format('DD/MM/YYYY'),
                  tradeDetails: [
                    {
                      exchange: optScrip[0].exch_seg,
                      expireDate: optScrip[0].expiry,
                      netQty: '15',
                      optionType: 'CE',
                      strike: optScrip[0].strike,
                      symbol: optScrip[0].symbol,
                      token: optScrip[0].token,
                      tradingSymbol: optScrip[0].symbol,
                      closed: false,
                      tradedPrice: 0,
                    },
                  ],
                  mtm: [{ time: istTz, value: mtm.toString() }],
                };

                makeNewTrade(Strategy.RSI, json);
              }
              //makeNewTrade(Strategy.RSI);
              //HERE AFTER I'VE TO WRITE CODE TO READ FIREBASE DATABASE SO THAT I CAN KNOW, IF A TRADE IS ALREADY PLACED AND ALSO TO READ MTM SO AS TO BOOK PROFIT/LOSS
              resolve(optScrip);
            } else {
              resolve({ rsi: calculatedRsi });
            }
          }
        );
      });
    }
  }
};
