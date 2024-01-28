import { get, isArray, isEmpty } from 'lodash';
const axios = require('axios');
import {
  DELAY,
  delay,
  generateSmartSession,
  getCredentials,
  getPositions,
  getScripName,
  getSmartSession,
  getTodayExpiry,
  isCurrentTimeGreater,
  isTradingHoliday,
} from 'krb-smart-api-module';
import {
  areBothOptionTypesPresentForStrike,
  checkStrike,
  getAtmStrikePrice,
  getLastWednesdayOfMonth,
  getNearestStrike,
  getOpenPositions,
  getStrikeDifference,
  hedgeCalculation,
  isMarketClosed,
} from './functions';
import { Response } from 'express';
import {
  BothPresent,
  CheckOptionType,
  CheckPosition,
  HistoryInterface,
  ISmartApiData,
  LtpDataType,
  OptionType,
  OrderData,
  Position,
  Strategy,
  TimeComparisonType,
  checkBothLegsType,
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
  DATEFORMAT,
  GET_LTP_DATA_API,
  GET_MARGIN,
  HISTORIC_API,
  LOSSPERLOT,
  LOTS,
  ME,
  MESSAGE_NOT_TAKE_TRADE,
  ORDER_API,
  SCRIPMASTER,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
} from './constants';
import DataStore from '../store/dataStore';
import { findTrade, makeNewTrade } from './dbService';
import OrderStore from '../store/orderStore';
import ScripMasterStore from '../store/scripMasterStore';
import moment from 'moment-timezone';

export const getLtpData = async ({
  exchange,
  tradingsymbol,
  symboltoken,
}: getLtpDataType): Promise<LtpDataType> => {
  const smartApiData: ISmartApiData = await getSmartSession();
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

const fetchData = async (): Promise<scripMasterResponse[]> => {
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

/* export const getAllFut = async () => {
  let scripMaster: scripMasterResponse[] = await fetchData();
  console.log(
    `${ALGO}: Scrip master an array: ${isArray(scripMaster)}, its length is: ${
      scripMaster.length
    }`
  );
  if (isArray(scripMaster) && scripMaster.length > 0) {
    console.log(`${ALGO}: all check cleared getScrip call`);
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
}; */
/* export const getScripFut = async ({ scriptName }: getScripFutType) => {
  let scripMaster: scripMasterResponse[] = await fetchData();
  console.log(
    `${ALGO}: scriptName: ${scriptName}, is scrip master an array: ${isArray(
      scripMaster
    )}, its length is: ${scripMaster.length}`
  );
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    console.log(`${ALGO}: all check cleared getScrip call`);
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
}; */
export const getScrip = async ({
  scriptName,
  strikePrice,
  optionType,
  expiryDate,
}: getScripType): Promise<scripMasterResponse[]> => {
  let scripMaster: scripMasterResponse[] = await fetchData();
  console.log(
    `${ALGO}: scriptName: ${scriptName}, is scrip master an array: ${isArray(
      scripMaster
    )}, its length is: ${scripMaster.length}`
  );
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    console.log(`${ALGO}: all check cleared getScrip call`);
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
        _scripName === scriptName &&
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

/* const getHistoricPrices = async (data: HistoryInterface) => {
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
}; */
const doOrder = async ({
  tradingsymbol,
  transactionType,
  symboltoken,
  productType = 'CARRYFORWARD',
  lotSize,
  variety = 'NORMAL',
  ordertype = 'MARKET',
  price,
  triggerprice,
}: doOrderType): Promise<doOrderResponse> => {
  const smartApiData: ISmartApiData = await getSmartSession();
  const jwtToken = get(smartApiData, 'jwtToken');
  const orderStoreData = OrderStore.getInstance().getPostData();
  const quantity = Math.abs(lotSize * orderStoreData.QUANTITY);
  let data = JSON.stringify({
    exchange: 'NFO',
    tradingsymbol,
    symboltoken,
    quantity: quantity,
    disclosedquantity: quantity,
    transactiontype: transactionType,
    ordertype,
    variety,
    producttype: productType,
    duration: 'DAY',
    price,
    triggerprice,
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
  //console.log(`${ALGO}: doOrder config `, config);
  return axios(config)
    .then((response: Response) => {
      const resData = get(response, 'data');
      //console.log(`${ALGO}: order response `, resData);
      return resData;
    })
    .catch(function (error: Response) {
      const errorMessage = `${ALGO}: doOrder failed error below`;
      console.log(errorMessage);
      console.log(error);
      throw error;
    });
};
const doOrderByStrike = async (
  strike: number,
  optionType: OptionType,
  transactionType: 'BUY' | 'SELL'
): Promise<OrderData> => {
  try {
    const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
    console.log(
      `${ALGO} {doOrderByStrike}: stike: ${strike}, expiryDate: ${expiryDate}`
    );
    await delay({ milliSeconds: DELAY });
    const token = await getScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
      expiryDate: expiryDate,
      optionType: optionType,
      strikePrice: strike.toString(),
    });
    console.log(`${ALGO} {doOrderByStrike}: token: `, token);
    await delay({ milliSeconds: DELAY });
    const lotsize = get(token, '0.lotsize', '0') || '0';
    const orderData = await doOrder({
      tradingsymbol: get(token, '0.symbol', ''),
      symboltoken: get(token, '0.token', ''),
      transactionType: transactionType,
      lotSize: parseInt(lotsize),
      variety: 'NORMAL',
      ordertype: 'MARKET',
    });
    console.log(`${ALGO} {doOrderByStrike}: order status: `, orderData.status);
    const lots = OrderStore.getInstance().getPostData().QUANTITY;
    const qty = parseInt(lotsize) * lots;
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
const shortStraddle = async () => {
  try {
    //GET ATM STIKE PRICE
    const atmStrike = await getAtmStrikePrice();
    const index = OrderStore.getInstance().getPostData().INDEX;
    const hedgeVariance = hedgeCalculation(index);
    let strikeDiff = getStrikeDifference(index);
    console.log(`${ALGO}: STRIKEDIFF: ${strikeDiff}`);
    let order = await doOrderByStrike(
      atmStrike + hedgeVariance,
      OptionType.CE,
      'BUY'
    );
    order = await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
    order = await doOrderByStrike(
      atmStrike - hedgeVariance,
      OptionType.PE,
      'BUY'
    );
    order = await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
  } catch (error) {
    const errorMessage = `${ALGO}: shortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
const checkBoth_CE_PE_Present = (data: BothPresent) => {
  if (data.ce && data.pe) return CheckOptionType.BOTH_CE_PE_PRESENT;
  else if (!data.ce && !data.pe) return CheckOptionType.BOTH_CE_PE_NOT_PRESENT;
  else if (!data.ce && data.pe) return CheckOptionType.ONLY_PE_PRESENT;
  else return CheckOptionType.ONLY_CE_PRESENT;
};
const checkBothLegs = async ({
  cepe_present,
  atmStrike,
}: checkBothLegsType) => {
  const idx = OrderStore.getInstance().getPostData().INDEX;
  const hedge = hedgeCalculation(idx);
  try {
    if (cepe_present === CheckOptionType.BOTH_CE_PE_NOT_PRESENT) {
      console.log(`${ALGO}: Both legs not present, selling both!`);
      await shortStraddle();
    } else if (cepe_present === CheckOptionType.ONLY_CE_PRESENT) {
      console.log(`${ALGO}: only calls present, selling puts`);
      let orderData = await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
      orderData = await doOrderByStrike(
        atmStrike - hedge,
        OptionType.PE,
        'BUY'
      );
    } else if (cepe_present === CheckOptionType.ONLY_PE_PRESENT) {
      console.log(`${ALGO}: only puts present, selling calls`);
      let orderData = await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
      orderData = await doOrderByStrike(
        atmStrike + hedge,
        OptionType.CE,
        'BUY'
      );
    } else {
      console.log(
        `${ALGO}: Both legs of the atm strike present, no need to worry!`
      );
    }
  } catch (error) {
    const errorMessage = `${ALGO}: checkBothLegs failed ...`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
const repeatShortStraddle = async (difference: number, atmStrike: number) => {
  try {
    const idx = OrderStore.getInstance().getPostData().INDEX;
    let strikeDiff = getStrikeDifference(idx);
    console.log(`${ALGO}: strikeDiff: ${strikeDiff}`);
    console.log(`${ALGO}: difference: ${Math.abs(difference)}`);
    const positions = await getPositionsJson();
    const isSameStrikeAlreadyTraded = checkStrike(
      positions,
      atmStrike.toString()
    );
    console.log(
      `${ALGO}: checking conditions\n\t1. if the difference is more or equal to strikeDiff (${strikeDiff}): ${
        Math.abs(difference) >= strikeDiff
      }\n\t2. if this same strike is already traded: ${isSameStrikeAlreadyTraded}`
    );
    const result = areBothOptionTypesPresentForStrike(
      positions,
      atmStrike.toString()
    );
    console.log(`${ALGO}: areBothOptionTypesPresentForStrike: `, result);
    const cepe_present = checkBoth_CE_PE_Present(result);
    if (
      Math.abs(difference) >= strikeDiff &&
      isSameStrikeAlreadyTraded === false
    ) {
      console.log(`${ALGO}: executing trade repeat ...`);
      checkBothLegs({ cepe_present, atmStrike });
    }
    /* else if (difference === 0 && isSameStrikeAlreadyTraded) {
      console.log(`${ALGO}: same strike already traded checking both legs ...`);
      checkBothLegs({ cepe_present, atmStrike });
    } */
  } catch (error) {
    const errorMessage = `${ALGO}: repeatShortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
const getPositionByToken = ({ positions, token }: getPositionByTokenType) => {
  for (const position of positions) {
    if (position.symboltoken === token) {
      return position;
    }
  }
  return null;
};
const findTradeByStrike = async (tradeStrike: number) => {
  const positions = await getPositionsJson();
  for (const position of positions) {
    const strike = parseInt(position.strikeprice);
    if (strike === tradeStrike) return position;
  }
  return null;
};
const shouldCloseTrade = async ({ ltp, avg, trade }: shouldCloseTradeType) => {
  const doubledPrice = avg * 2;
  const isPriceDoubled = parseInt(trade.netqty) < 0 && ltp >= doubledPrice;
  const isLtpBelowOne = parseInt(trade.netqty) < 0 && ltp < 1;
  console.log(
    `${ALGO}: checking shouldCloseTrade, trade strike: ${trade.strikeprice}, trade option type: ${trade.optiontype}, ltp: ${ltp}, doubledPrice: ${doubledPrice}`
  );
  if (isPriceDoubled || isLtpBelowOne) {
    console.log(
      `${ALGO}: Yes, close this particular trade with strike price ${trade.strikeprice}`
    );
    try {
      const index = OrderStore.getInstance().getPostData().INDEX;
      await closeParticularTrade({ trade });
      let buyStrike;
      if (trade.optiontype === 'CE')
        buyStrike = parseInt(trade.strikeprice) + hedgeCalculation(index);
      else buyStrike = parseInt(trade.strikeprice) - hedgeCalculation(index);
      const buyTrade = await findTradeByStrike(buyStrike);
      if (buyTrade) {
        await closeParticularTrade({ trade: buyTrade });
      }
    } catch (error) {
      console.log(`${ALGO}: closeParticularTrade could not be called`);
      throw error;
    }
  }
};
const checkPositionToClose = async ({
  openPositions,
}: checkPositionToCloseType) => {
  console.log(`${ALGO}: checkPositionToClose`);
  try {
    for (const position of openPositions) {
      if (
        position &&
        position.exchange === 'NFO' &&
        position.tradingsymbol &&
        position.sellavgprice &&
        parseInt(position.netqty) < 0
      ) {
        const currentLtpPrice = getPositionByToken({
          positions: openPositions,
          token: position.symboltoken,
        })?.ltp;
        await shouldCloseTrade({
          ltp:
            typeof currentLtpPrice === 'string'
              ? parseFloat(currentLtpPrice)
              : 0,
          avg: parseFloat(position.sellavgprice),
          trade: position,
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
const getPositionsJson = async () => {
  try {
    const smartSession = await getSmartSession();
    const cred = getCredentials();
    await delay({ milliSeconds: DELAY });
    const positions: Position[] = await getPositions(smartSession, cred);
    const openPositions = getOpenPositions(positions);
    console.log(`${ALGO}: total open positions are ${openPositions.length}`);
    return openPositions;
  } catch (error) {
    const errorMessage = `${ALGO}: getPositionsJson failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
const closeParticularTrade = async ({ trade }: { trade: Position }) => {
  try {
    await delay({ milliSeconds: DELAY });
    const netQty = parseInt(trade.netqty);
    const tradingsymbol = trade.tradingsymbol;
    const transactionType =
      netQty < 0 ? TRANSACTION_TYPE_BUY : TRANSACTION_TYPE_SELL;
    const symboltoken = trade.symboltoken;
    const lotSize = parseInt(trade.lotsize);
    const transactionStatus = await doOrder({
      tradingsymbol,
      transactionType,
      symboltoken,
      lotSize,
      variety: 'NORMAL',
      ordertype: 'MARKET',
    });
    console.log(`${ALGO}, closeParticularTrade: `, transactionStatus);
  } catch (error) {
    const errorMessage = `${ALGO}: closeTrade failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
const closeAllTrades = async () => {
  try {
    await delay({ milliSeconds: DELAY });
    const positions = await getPositionsJson();
    if (Array.isArray(positions)) {
      for (const position of positions) {
        await closeParticularTrade({ trade: position });
      }
    }
  } catch (error) {
    const errorMessage = `${ALGO}: closeAllTrades failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
const closeTrade = async () => {
  console.log(`${ME}: check if all the trades are closed.`);
  while ((await getPositionsJson()).length > 0) {
    console.log(`${ALGO}: all trades are not closed, closing trades...`);
    await closeAllTrades();
  }
  console.log(`${ALGO}: Yes, all the trades are closed.`);
};
const checkToRepeatShortStraddle = async (
  atmStrike: number,
  previousTradeStrikePrice: number
) => {
  console.log(
    `${ALGO}: atm strike price is ${atmStrike}. previous traded strike price is ${previousTradeStrikePrice}`
  );
  if (isFinite(atmStrike)) {
    const difference = atmStrike - previousTradeStrikePrice;
    await delay({ milliSeconds: DELAY });
    await repeatShortStraddle(difference, atmStrike);
    if (atmStrike > previousTradeStrikePrice) {
      console.log(
        `${ALGO}: atm strike is greater than previously traded strike price. The difference is ${difference}`
      );
    } else if (atmStrike < previousTradeStrikePrice) {
      console.log(
        `${ALGO}: atm strike is lesser than previously traded strike price. The difference is ${difference}`
      );
    } else {
      console.log(
        `${ALGO}: atm strike is equal to previously traded strike price. The difference is ${difference}`
      );
    }
  } else {
    console.log(`${ALGO}: Oops, 'atmStrike' is infinity! Stopping operations.`);
    throw new Error(`Oops, atmStrike is infinity! Stopping operations.`);
  }
};
const coreTradeExecution = async ({ data }: { data: Position[] }) => {
  const isTradeAlreadyTaken = Array.isArray(data) && data.length > 0;
  if (isTradeAlreadyTaken === false) {
    console.log(`${ALGO}: executing trade`);
    await shortStraddle();
  } else {
    console.log(
      `${ALGO}: trade executed already checking conditions to repeat the trade`
    );
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice();
    const no_of_trades = data.length;
    let previousTradeStrikePrice: string | number = getNearestStrike({
      algoTrades: data,
      atmStrike: atmStrike,
    });
    console.log(
      `${ALGO}: atmStrike is ${atmStrike}, no of trades taken are ${no_of_trades}, previously traded  strike price is ${previousTradeStrikePrice}`
    );
    await checkToRepeatShortStraddle(atmStrike, previousTradeStrikePrice);
  }
};
const getMtm = async () => {
  const smartSession = await getSmartSession();
  const cred = getCredentials();
  await delay({ milliSeconds: DELAY });
  const tradedPositions: Position[] = await getPositions(smartSession, cred);
  const tradedExpiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
  const tradedIndex = OrderStore.getInstance().getPostData().INDEX;
  let mtm = 0;
  if (tradedPositions !== null) {
    for (const position of tradedPositions) {
      const isSameExpiryDate = position.expirydate === tradedExpiryDate;
      const isSameIndex = position.symbolname === tradedIndex;
      if (isSameExpiryDate && isSameIndex) {
        const unrealised = parseFloat(position.unrealised);
        const realised = parseFloat(position.realised);
        mtm += unrealised + realised;
      }
    }
  }
  return mtm;
};
const executeTrade = async () => {
  let resp: number | string = `${ALGO}: Trade Closed`;
  const closingTime: TimeComparisonType = { hours: 15, minutes: 17 };
  const isPastClosingTime = isCurrentTimeGreater(closingTime);
  // const isPastClosingTime = false; //HARDCODED FOR TESTING
  // const marginDetails = await getMarginDetails();
  // console.log(`${ALGO}: marginDetails: `, marginDetails);
  const quantity = OrderStore.getInstance().getPostData().QUANTITY;
  const lossPerLot = OrderStore.getInstance().getPostData().LOSSPERLOT;
  const calculatedFixStopLoss = quantity * lossPerLot;
  console.log(`${ALGO}: calculatedFixStopLoss: ${calculatedFixStopLoss}`);
  let mtmData = await getMtm();
  console.log(`${ALGO}: MTM: ${mtmData} -----`);
  let isStoplossExceeded = false;
  if (mtmData < 0) {
    isStoplossExceeded = Math.abs(mtmData) > calculatedFixStopLoss;
  }
  console.log(`${ALGO}: isStoplossExceeded: ${isStoplossExceeded}`);
  console.log(`${ALGO}: isPastClosingTime: ${isPastClosingTime}`);
  let data = await getPositionsJson();
  await checkPositionToClose({ openPositions: data });
  if (isPastClosingTime === false) await coreTradeExecution({ data });
  if (isPastClosingTime || isStoplossExceeded) await closeTrade();
  return resp;
};
const isTradeAllowed = async () => {
  const isMarketOpen = !isMarketClosed();
  const isWeekend = moment().day() === 0 || moment().day() === 6;
  const isHoliday = isTradingHoliday();
  let expiryDate = getTodayExpiry();
  const isTodayLastWednesdayOfMonth =
    expiryDate === getLastWednesdayOfMonth().format(DATEFORMAT).toUpperCase();
  const hasTimePassedToTakeTrade = isCurrentTimeGreater({
    hours: 9,
    minutes: 15,
  });
  let isSmartAPIWorking = false;
  try {
    const creds = DataStore.getInstance().getPostData();
    const smartData = await generateSmartSession(creds);
    await delay({ milliSeconds: DELAY });
    isSmartAPIWorking = !isEmpty(smartData);
  } catch (err) {
    console.log('Error occurred for generateSmartSession');
  }
  console.log(
    `${ALGO}: checking conditions, isWeekend: ${isWeekend}, isHoliday: ${isHoliday}, isMarketOpen: ${isMarketOpen}, hasTimePassed 09:45am: ${hasTimePassedToTakeTrade}, isSmartAPIWorking: ${isSmartAPIWorking}`
  );
  return (
    isWeekend === false &&
    isMarketOpen &&
    hasTimePassedToTakeTrade &&
    isSmartAPIWorking &&
    isHoliday === false &&
    isTodayLastWednesdayOfMonth === false
  );
};
export const checkMarketConditionsAndExecuteTrade = async (
  lots: number = LOTS,
  lossPerLot: number = LOSSPERLOT
) => {
  let expiryDate = getTodayExpiry();
  let indiaVix = await getIndexScrip({ scriptName: 'INDIA VIX' });
  await delay({ milliSeconds: DELAY });
  await delay({ milliSeconds: DELAY });
  let indiaVixLtp = await getLtpData({
    exchange: indiaVix[0].exch_seg,
    symboltoken: indiaVix[0].token,
    tradingsymbol: indiaVix[0].symbol,
  });
  await delay({ milliSeconds: DELAY });
  console.log(`${ALGO}: INDIA VIX ltp is ${indiaVixLtp.ltp}`);
  console.log(`${ALGO}: expiry date is ${expiryDate}`);
  OrderStore.getInstance().setPostData({
    QUANTITY: lots,
    EXPIRYDATE: expiryDate,
    INDEX: getScripName(expiryDate),
    LOSSPERLOT: lossPerLot,
    INDIAVIX: indiaVixLtp.ltp,
  });
  console.log(
    `${ALGO}: OrderStore data: `,
    OrderStore.getInstance().getPostData()
  );
  try {
    // await isTradeAllowed(); //HARDCODED FOR TESTING
    // return await executeTrade(); //HARDCODED FOR TESTING
    const isAllowed = await isTradeAllowed();
    if (isAllowed === false) return MESSAGE_NOT_TAKE_TRADE;
    else return await executeTrade();
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
