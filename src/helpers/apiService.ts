import { get, isArray, isEmpty } from 'lodash';
let { SmartAPI } = require('smartapi-javascript');
const axios = require('axios');
const totp = require('totp-generator');
import {
  areBothOptionTypesPresentForStrike,
  calculateRSI,
  checkPositionsExistsForMonthlyExpiry,
  checkStrike,
  createJsonFile,
  delay,
  getAtmStrikePrice,
  getCurrentTimeAndPastTime,
  getData,
  getLastThursdayOfCurrentMonth,
  getNearestStrike,
  getNextExpiry,
  getOpenPositions,
  isCurrentTimeGreater,
  isMarketClosed,
  readJsonFile,
  setSmartSession,
  updateMaxSl,
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
  TradeType,
  checkPositionToCloseType,
  doOrderResponse,
  doOrderType,
  getLtpDataType,
  getPositionByTokenType,
  getScripFutType,
  getScripType,
  runOrbType,
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
  MTMDATATHRESHOLD,
  ORDER_API,
  SCRIPMASTER,
  SHORT_DELAY,
  STRIKE_DIFFERENCE,
  STRIKE_DIFFERENCE_POSITIONAL,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
} from './constants';
import DataStore from '../store/dataStore';
import SmartSession from '../store/smartSession';
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
        parseInt(get(scrip, 'lotsize')) < 300 &&
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
    let filteredScrip = scripMaster.filter((scrip) => {
      const _scripName: string = get(scrip, 'name', '') || '';
      const _expiry: string = getLastThursdayOfCurrentMonth();
      return (
        (_scripName.includes(scriptName) || _scripName === scriptName) &&
        get(scrip, 'exch_seg') === 'NFO' &&
        get(scrip, 'instrumenttype') === 'FUTSTK' &&
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
  let data = JSON.stringify({
    exchange: 'NFO',
    tradingsymbol,
    symboltoken,
    quantity: 15,
    disclosedquantity: 15,
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
  currentPositionsData.forEach((value) => {
    data.tradeDetails.forEach((trade) => {
      if (trade && trade.token === get(value, 'symboltoken', '')) {
        mtm += parseInt(get(value, 'unrealised', ''));
      }
    });
  });
  return mtm;
};
export const doOrderByStrike = async (
  tradeType: TradeType,
  strike: number,
  optionType: OptionType
): Promise<OrderData> => {
  try {
    const expiryDate =
      tradeType === TradeType.INTRADAY
        ? getNextExpiry()
        : getLastThursdayOfCurrentMonth();
    console.log(`${ALGO} {doOrderByStrike}: expiryDate: ${expiryDate}`);
    await delay({ milliSeconds: DELAY });
    const token = await getScrip({
      scriptName: 'BANKNIFTY',
      expiryDate: expiryDate,
      optionType: optionType,
      strikePrice: strike.toString(),
    });
    console.log(`${ALGO} {doOrderByStrike}: token: ${token}`);
    await delay({ milliSeconds: DELAY });
    const orderData = await doOrder({
      tradingsymbol: get(token, '0.symbol', ''),
      symboltoken: get(token, '0.token', ''),
      transactionType: TRANSACTION_TYPE_SELL,
    });
    console.log(`${ALGO} {doOrderByStrike}: orderData: `, orderData);
    return {
      stikePrice: strike.toString(),
      expiryDate: expiryDate,
      netQty: '-15',
      token: get(token, '0.token', ''),
      symbol: get(token, '0.symbol', ''),
      status: orderData.status,
    };
  } catch (error) {
    const errorMessage = `${ALGO}: doOrderByStrike failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const shortStraddle = async (
  tradeType: TradeType = TradeType.INTRADAY
) => {
  try {
    //GET ATM STIKE PRICE
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice(tradeType);
    await delay({ milliSeconds: DELAY });
    const ceOrderData = await doOrderByStrike(
      tradeType,
      atmStrike,
      OptionType.CE
    );
    console.log(`${ALGO} {shortStraddle}: ceOrderData: `, ceOrderData);
    await delay({ milliSeconds: DELAY });
    const peOrderData = await doOrderByStrike(
      tradeType,
      atmStrike,
      OptionType.PE
    );
    console.log(`${ALGO} {shortStraddle}: peOrderData: `, peOrderData);
    return {
      stikePrice: atmStrike.toString(),
      expiryDate: ceOrderData.expiryDate,
      netQty: ceOrderData.netQty,
      ceOrderToken: ceOrderData.token,
      peOrderToken: peOrderData.token,
      ceOrderSymbol: ceOrderData.symbol,
      peOrderSymbol: peOrderData.symbol,
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
  atmStrike: number,
  tradeType: TradeType
) => {
  try {
    const data = readJsonFile(tradeType);
    const strikeDiff =
      tradeType === TradeType.INTRADAY
        ? STRIKE_DIFFERENCE
        : STRIKE_DIFFERENCE_POSITIONAL;
    console.log(
      `${ALGO}: checking conditions\n1. if the difference is more or equal to than env const STRIKE_DIFFERENCE (${strikeDiff}): ${
        difference >= strikeDiff
      }\n2. if this same strike is already traded: ${checkStrike(
        data.tradeDetails,
        atmStrike.toString()
      )}`
    );
    const result = areBothOptionTypesPresentForStrike(
      data.tradeDetails,
      atmStrike.toString()
    );
    const cepe_present = checkBoth_CE_PE_Present(result);
    if (difference >= strikeDiff && (!result.ce || !result.pe)) {
      console.log(`${ALGO}: executing trade repeat ...`);
      if (cepe_present === CheckOptionType.BOTH_CE_PE_NOT_PRESENT) {
        const shortStraddleData = await shortStraddle(tradeType);
        await addShortStraddleData({ data, shortStraddleData, tradeType });
      } else if (cepe_present === CheckOptionType.ONLY_CE_PRESENT) {
        const orderData = await doOrderByStrike(
          tradeType,
          atmStrike,
          OptionType.PE
        );
        addOrderData(data, orderData, OptionType.PE, tradeType);
      } else if (cepe_present === CheckOptionType.ONLY_PE_PRESENT) {
        const orderData = await doOrderByStrike(
          tradeType,
          atmStrike,
          OptionType.CE
        );
        addOrderData(data, orderData, OptionType.CE, tradeType);
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
  tradeType = TradeType.INTRADAY,
}: checkPositionToCloseType) => {
  try {
    const data = readJsonFile(tradeType);
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
    await writeJsonFile(data, tradeType);
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
  } catch (error) {
    const errorMessage = `${ALGO}: checkPositionToClose failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const getPositionsJson = async (
  tradeType: TradeType = TradeType.INTRADAY
) => {
  try {
    const currentPositions = await getPositions();
    const positions: Position[] = get(currentPositions, 'data', []) || [];
    const openPositions = getOpenPositions(positions);
    await checkPositionToClose({ openPositions, tradeType });
    console.log(
      `${ALGO}: currentPositions fetch successfully, currently total open positions are ${openPositions.length}`
    );
    const json = await createJsonFile(tradeType);
    if (checkPositionsExistsForMonthlyExpiry(openPositions)) {
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
    await writeJsonFile(json, tradeType);
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
    const transactionStatus = await doOrder({
      tradingsymbol: trade.tradingSymbol,
      transactionType: TRANSACTION_TYPE_BUY,
      symboltoken: trade.token,
    });
    console.log(`${ALGO} transactionStatus: `, transactionStatus);
    trade.closed = transactionStatus.status;
    return transactionStatus.status;
  } catch (error) {
    const errorMessage = `${ALGO}: closeTrade failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const closeAllTrades = async (
  tradeType: TradeType = TradeType.INTRADAY
) => {
  try {
    await delay({ milliSeconds: DELAY });
    const data = readJsonFile(tradeType);
    await delay({ milliSeconds: DELAY });
    const tradeDetails = data.tradeDetails;

    if (Array.isArray(tradeDetails)) {
      for (const trade of tradeDetails) {
        await closeParticularTrade({ trade });
      }
      await delay({ milliSeconds: DELAY });
      await writeJsonFile(data, tradeType);
    }
  } catch (error) {
    const errorMessage = `${ALGO}: closeAllTrades failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
export const closeTrade = async (tradeType: TradeType = TradeType.INTRADAY) => {
  console.log(`${ME}: check if all the trades are closed.`);
  while ((await areAllTradesClosed(tradeType)) === false) {
    console.log(`${ALGO}: all trades are not closed, closing trades...`);
    await closeAllTrades(tradeType);
  }
  console.log(`${ALGO}: Yes, all the trades are closed.`);
  await delay({ milliSeconds: DELAY });
  const data = readJsonFile(tradeType);
  data.isTradeClosed = true;
  await delay({ milliSeconds: DELAY });
  await writeJsonFile(data, tradeType);
};
export const areAllTradesClosed = async (
  tradeType: TradeType = TradeType.INTRADAY
) => {
  console.log(`${ALGO}: checking if all the trades are closed.`);
  await delay({ milliSeconds: DELAY });
  const data = readJsonFile(tradeType);
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
  previousTradeStrikePrice: number,
  tradeType: TradeType
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
      await repeatShortStraddle(difference, atmStrike, tradeType);
    } else if (atmStrike < previousTradeStrikePrice) {
      const difference = previousTradeStrikePrice - atmStrike;
      console.log(
        `${ALGO}: atm strike is lesser than previously traded strike price. The difference is ${difference}`
      );
      await delay({ milliSeconds: DELAY });
      await repeatShortStraddle(difference, atmStrike, tradeType);
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
  optionType: OptionType,
  tradeType: TradeType
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
      exchange: '',
      tradingSymbol: '',
    });
  }
  await writeJsonFile(data, tradeType);
};
export const addShortStraddleData = async ({
  data,
  shortStraddleData,
  tradeType = TradeType.INTRADAY,
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
    await writeJsonFile(data, tradeType);
  }
};
const coreTradeExecution = async (tradeType: TradeType) => {
  let data = await getData(tradeType);
  if (!data.isTradeExecuted) {
    console.log(`${ALGO}: executing trade`);
    const shortStraddleData = await shortStraddle(tradeType);
    await addShortStraddleData({ data, shortStraddleData, tradeType });
  } else {
    console.log(
      `${ALGO}: trade executed already checking conditions to repeat the trade`
    );
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice(tradeType);
    const no_of_trades = data.tradeDetails.length;
    const getAlgoTrades = data.tradeDetails;
    let previousTradeStrikePrice: string | number = getNearestStrike({
      algoTrades: getAlgoTrades,
      atmStrike: atmStrike,
    });
    console.log(
      `${ALGO}: atmStrike is ${atmStrike}, no of trades taken are ${no_of_trades}, previously traded  strike price is ${previousTradeStrikePrice}`
    );
    await checkToRepeatShortStraddle(
      atmStrike,
      previousTradeStrikePrice,
      tradeType
    );
  }
  console.log(`${ALGO}: calculating mtm...`);
  await delay({ milliSeconds: DELAY });
  let mtmData = await calculateMtm({ data });
  console.log(`${ALGO}: mtm: ${mtmData}`);
  await delay({ milliSeconds: DELAY });
  const istTz = new Date().toLocaleString('default', {
    timeZone: 'Asia/Kolkata',
  });
  const mtm = data.mtm;
  mtm.push({ time: istTz, value: mtmData.toString() });
  await delay({ milliSeconds: DELAY });
  await writeJsonFile(data, tradeType);
  return mtmData;
};
export const executeTrade = async (tradeType: TradeType) => {
  const mtmData = await coreTradeExecution(tradeType);
  //const mtmData = 0;
  await delay({ milliSeconds: DELAY });
  await getPositionsJson(tradeType);
  const closingTime: TimeComparisonType = { hours: 15, minutes: 15 };
  console.log(
    `${ALGO}: checking condition hasTimePassed15:15: ${isCurrentTimeGreater(
      closingTime
    )}`
  );
  const mtmThreshold = -MTMDATATHRESHOLD;
  if (
    tradeType === TradeType.INTRADAY &&
    (mtmData < mtmThreshold || isCurrentTimeGreater(closingTime))
  ) {
    console.log(`${ALGO}: closing the trade`);
    await closeTrade(tradeType);
    return '${ALGO}: Trade Closed';
  } else {
    console.log(`${ALGO}: returning mtm to api response`);
    return mtmData;
  }
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
  tradeType: TradeType,
  strategy: Strategy = Strategy.SHORTSTRADDLE
) => {
  let data = await createJsonFile(tradeType);
  if (await isTradeAllowed(data)) {
    try {
      if (strategy === Strategy.SHORTSTRADDLE) {
        return await executeTrade(tradeType);
      } else if (strategy === Strategy.RSI) {
        return await runRsiAlgo();
      }
    } catch (err) {
      return err;
    }
  } else {
    return MESSAGE_NOT_TAKE_TRADE;
  }
};
export const runRsiAlgo = async () => {
  const allFuts = await getAllFut();
  for (const scrip of allFuts) {
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
      const last14Closing: number[] = [];
      for (
        let i = historicData.length - 1;
        i >= historicData.length - 14;
        i--
      ) {
        last14Closing.push(historicData[i][4]);
      }
      console.log(`RSI: ${scrip.symbol}`, calculateRSI(last14Closing, 14));
    }
    //console.log(historicData);
  }

  return allFuts;
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
export const runOrb = async ({
  scriptName,
  price,
  maxSl,
  tradeDirection,
  trailSl,
}: runOrbType) => {
  const scrip = await getScripFut({ scriptName });
  let positionsResponse = await getPositions();
  let positionsData = get(positionsResponse, 'data', []) ?? [];
  let mtm = 0;
  if (Array.isArray(positionsData) && positionsData.length > 0) {
    const position = positionsData.filter((position) => {
      if (get(position, 'symboltoken') === scrip.token) return position;
    });
    if (!position) {
      const scripData = await getLtpData({
        exchange: scrip.exch_seg,
        symboltoken: scrip.token,
        tradingsymbol: scrip.symbol,
      });
      if (tradeDirection === 'up' && scripData.ltp > price) {
        doOrder({
          tradingsymbol: scrip.symbol,
          symboltoken: scrip.token,
          transactionType: TRANSACTION_TYPE_BUY,
        });
      } else if (tradeDirection === 'down' && scripData.ltp < price) {
        doOrder({
          tradingsymbol: scrip.symbol,
          symboltoken: scrip.token,
          transactionType: TRANSACTION_TYPE_SELL,
        });
      }
    }
  }
  if (Array.isArray(positionsData) && positionsData.length > 0) {
    const position = positionsData.filter((position) => {
      if (get(position, 'symboltoken') === scrip.token) return position;
    });
    mtm = parseInt(get(position, 'unrealised', '0') ?? '0');
    const updatedMaxSl = updateMaxSl({ mtm, maxSl, trailSl });
    if (Math.abs(mtm) > updatedMaxSl) {
      if (tradeDirection === 'up') {
        doOrder({
          tradingsymbol: scrip.symbol,
          symboltoken: scrip.token,
          transactionType: TRANSACTION_TYPE_SELL,
          productType: 'INTRADAY',
        });
      } else {
        doOrder({
          tradingsymbol: scrip.symbol,
          symboltoken: scrip.token,
          transactionType: TRANSACTION_TYPE_BUY,
          productType: 'INTRADAY',
        });
      }
    }
  }
  return { mtm };
};
