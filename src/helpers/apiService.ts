import { get as _get, isArray, isEmpty } from 'lodash';
// eslint-disable-next-line
const axios = require('axios');
import {
  DELAY,
  delay,
  generateSmartSession,
  getCredentials,
  getNearestStrike,
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
  getAllOpenPositions,
  getAtmStrikePrice,
  getLastWednesdayOfMonth,
  getOpenSellPositions,
  getStrikeDifference,
  hedgeCalculation,
  isMarketClosed,
} from './functions';
import { Response } from 'express';
import {
  BothPresent,
  CheckOptionType,
  CheckPosition,
  INDICES,
  ISmartApiData,
  LtpDataType,
  OptionType,
  OrderData,
  Position,
  TimeComparisonType,
  checkBothLegsType,
  // checkPositionToCloseType,
  doOrderResponse,
  doOrderType,
  getLtpDataType,
  // getPositionByTokenType,
  getScripType,
  scripMasterResponse,
  // shouldCloseTradeType,
} from '../app.interface';
import {
  ALGO,
  DATEFORMAT,
  GET_LTP_DATA_API,
  LOSSPERLOT,
  LOTS,
  ME,
  MESSAGE_NOT_TAKE_TRADE,
  ORDER_API,
  SCRIPMASTER,
  SEARCHSCRIPAPI,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
} from './constants';
import DataStore from '../store/dataStore';
import { recordNewTrade } from './dbService';
import OrderStore from '../store/orderStore';
import ScripMasterStore from '../store/scripMasterStore';
import moment from 'moment-timezone';
/**
 * Fetches the Last Traded Price (LTP) for a given scrip.
 * @param {getLtpDataType} params - The parameters for fetching LTP data.
 * @returns {Promise<LtpDataType>} A promise that resolves with the LTP data.
 */
export const getLtpData = async ({ exchange, tradingsymbol, symboltoken }: getLtpDataType): Promise<LtpDataType> => {
  const smartApiData: ISmartApiData = await getSmartSession();
  const jwtToken = _get(smartApiData, 'jwtToken');
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
    return _get(response, 'data.data', {}) || {};
  } catch (error) {
    console.log(`${ALGO}: the GET_LTP_DATA_API failed error below`);
    console.log(error);
    throw error;
  }
};
/**
 * Searches for a scrip by its name.
 * @param {string} scripName - The name of the scrip to search for.
 * @returns {Promise<any>} A promise that resolves with the search results.
 */
export const searchScrip = async (scripName: string) => {
  const smartApiData: ISmartApiData = await getSmartSession();
  const jwtToken = _get(smartApiData, 'jwtToken');
  const cred = DataStore.getInstance().getPostData();
  const config = {
    method: 'post',
    url: SEARCHSCRIPAPI,
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
    data: { exchange: 'NFO', searchscrip: scripName },
  };
  return await axios(config).then((response: object) => {
    return _get(response, 'data.data', '');
  });
};
/**
 * Fetches the scrip master data.
 * It first checks if the data is available in the store, if not, it fetches from the API.
 * @returns {Promise<scripMasterResponse[]>} A promise that resolves with the scrip master data.
 */
export const fetchData = async (): Promise<scripMasterResponse[]> => {
  const data = ScripMasterStore.getInstance().getPostData().SCRIP_MASTER_JSON;
  if (data.length > 0) {
    return data as scripMasterResponse[];
  } else {
    return await axios
      .get(SCRIPMASTER)
      .then((response: object) => {
        const acData: scripMasterResponse[] = _get(response, 'data', []) || [];
        console.log(`${ALGO}: response if script master api loaded and its length is ${acData.length}`);
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
/**
 * Retrieves a scrip from the scrip master data based on the provided criteria.
 * @param {getScripType} params - The criteria to filter the scrip.
 * @returns {Promise<scripMasterResponse[]>} A promise that resolves with the filtered scrips.
 */
export const getScrip = async ({
  scriptName,
  strikePrice,
  optionType,
  expiryDate,
}: getScripType): Promise<scripMasterResponse[]> => {
  const scripMaster: scripMasterResponse[] = await fetchData();
  console.log(
    `${ALGO}: scriptName: ${scriptName}, is scrip master an array: ${isArray(scripMaster)}, its length is: ${
      scripMaster.length
    }`
  );
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    console.log(`${ALGO}: all check cleared getScrip call`);
    let scrips = scripMaster.filter(scrip => {
      const _scripName: string = _get(scrip, 'name', '') || '';
      const _symbol: string = _get(scrip, 'symbol', '') || '';
      const _expiry: string = _get(scrip, 'expiry', '') || '';
      return (
        (_scripName.includes(scriptName) || _scripName === scriptName) &&
        _get(scrip, 'exch_seg') === 'NFO' &&
        _get(scrip, 'instrumenttype') === 'OPTIDX' &&
        (strikePrice === undefined || _symbol.includes(strikePrice)) &&
        (optionType === undefined || _symbol.includes(optionType)) &&
        _expiry === expiryDate
      );
    });
    scrips.sort((curr: object, next: object) => _get(curr, 'token', 0) - _get(next, 'token', 0));
    scrips = scrips.map((element: object) => {
      return {
        exch_seg: _get(element, 'exch_seg', '') || '',
        expiry: _get(element, 'expiry', '') || '',
        instrumenttype: _get(element, 'instrumenttype', '') || '',
        lotsize: _get(element, 'lotsize', '') || '',
        name: _get(element, 'name', '') || '',
        strike: _get(element, 'strike', '') || '',
        symbol: _get(element, 'symbol', '') || '',
        tick_size: _get(element, 'tick_size', '') || '',
        token: _get(element, 'token', '') || '',
      };
    });
    return scrips;
  } else {
    const errorMessage = `${ALGO}: getScrip failed`;
    console.log(errorMessage);
    throw errorMessage;
  }
};
/**
 * Retrieves an index scrip from the scrip master data.
 * @param {{ scriptName: string }} params - The name of the index scrip.
 * @returns {Promise<scripMasterResponse[]>} A promise that resolves with the index scrip.
 */
export const getIndexScrip = async ({ scriptName }: { scriptName: string }): Promise<scripMasterResponse[]> => {
  const scripMaster: scripMasterResponse[] = await fetchData();
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    const scrips = scripMaster.filter(scrip => {
      const _scripName: string = _get(scrip, 'name', '') || '';
      return _scripName === scriptName && _get(scrip, 'instrumenttype') === 'AMXIDX';
    });
    return scrips;
  } else {
    const errorMessage = `${ALGO}: getScrip failed`;
    console.log(errorMessage);
    throw errorMessage;
  }
};
/**
 * Places an order.
 * @param {doOrderType} params - The order parameters.
 * @returns {Promise<doOrderResponse>} A promise that resolves with the order response.
 */
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
  isHedge,
}: doOrderType): Promise<doOrderResponse> => {
  const smartApiData: ISmartApiData = await getSmartSession();
  const jwtToken = _get(smartApiData, 'jwtToken');
  const lots = OrderStore.getInstance().getPostData().QUANTITY;
  const hedgeQuantity = lots * 5;
  const lotsCalc = isHedge ? hedgeQuantity : lots;
  console.log(`${ALGO} {doOrderByStrike}: isHedge: ${isHedge}, lotsCalc: ${lotsCalc}, hedgeQuantity: ${hedgeQuantity}`);
  const quantity = Math.abs(lotSize * lotsCalc);
  const data = JSON.stringify({
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
  const config = {
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
      const resData = _get(response, 'data');
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
/**
 * Places an order by strike price.
 * @param {number} strike - The strike price.
 * @param {OptionType} optionType - The option type (CE or PE).
 * @param {'BUY' | 'SELL'} transactionType - The transaction type.
 * @param {boolean} [isHedge=false] - Whether the order is a hedge order.
 * @returns {Promise<OrderData | boolean>} A promise that resolves with the order data or a boolean indicating failure.
 */
const doOrderByStrike = async (
  strike: number,
  optionType: OptionType,
  transactionType: 'BUY' | 'SELL',
  isHedge = false
): Promise<OrderData | boolean> => {
  try {
    const expiryDate = OrderStore.getInstance().getPostData().EXPIRYDATE;
    console.log(`${ALGO} {doOrderByStrike}: stike: ${strike}, expiryDate: ${expiryDate}`);
    await delay({ milliSeconds: DELAY });
    const scripName = `${OrderStore.getInstance().getPostData().INDEX}${moment('2024-05-30').format('DDMMMYY').toUpperCase()}${strike.toString()}${OptionType.PE}`;
    console.log(`${ALGO}: scripName: `, scripName);
    const searchedScrip = await searchScrip(scripName);
    console.log(`${ALGO}: searchedScrip: `, searchedScrip);
    const token = await getScrip({
      scriptName: OrderStore.getInstance().getPostData().INDEX,
      expiryDate: expiryDate,
      optionType: optionType,
      strikePrice: strike.toString(),
    });
    const ltpData = await getLtpData({
      exchange: _get(token, '0.exch_seg', ''),
      symboltoken: _get(token, '0.token', ''),
      tradingsymbol: _get(token, '0.symbol', ''),
    });
    console.log(`${ALGO}: ltpData: `, ltpData.ltp);
    console.log(`${ALGO} {doOrderByStrike}: token: `, token);
    await delay({ milliSeconds: DELAY });
    const lotsize = _get(token, '0.lotsize', '0') || '0';
    // IF IS HEDGE WRITE LOGIC TO CHECK IF LTP IS LESS THAN 3 PREMIUM THEN ONLY GO AHEAD
    if (isHedge && ltpData.ltp > 3) {
      console.log(`${ALGO} {doOrderByStrike}: exit as ltp of hedge is more than 3`);
      return false;
    }
    const orderData = await doOrder({
      tradingsymbol: _get(token, '0.symbol', ''),
      symboltoken: _get(token, '0.token', ''),
      transactionType: transactionType,
      lotSize: parseInt(lotsize),
      variety: 'NORMAL',
      ordertype: 'MARKET',
      isHedge,
    });
    console.log(`${ALGO} {doOrderByStrike}: order status: `, orderData.status);
    return {
      stikePrice: strike.toString(),
      expiryDate: expiryDate,
      token: _get(token, '0.token', ''),
      symbol: _get(token, '0.symbol', ''),
      exchange: _get(token, '0.exch_seg', ''),
      status: orderData.status,
    };
  } catch (error) {
    const errorMessage = `${ALGO}: doOrderByStrike failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
/**
 * Creates a short straddle position.
 * @param {boolean} [isBuyHedge=false] - Whether to buy a hedge.
 * @returns {Promise<void>}
 */
const shortStraddle = async (isBuyHedge = false) => {
  try {
    //GET ATM STIKE PRICE
    const atmStrike = await getAtmStrikePrice();
    const index = OrderStore.getInstance().getPostData().INDEX;
    const hedgeVariance = hedgeCalculation(index);
    const strikeDiff = getStrikeDifference(index);
    console.log(`${ALGO}: STRIKEDIFF: ${strikeDiff}`);
    console.log(`${ALGO}: shortStraddle: atmStrike: ${atmStrike}, isBuyHedge: ${isBuyHedge}`);
    if (isBuyHedge) {
      let strikeVariance = 0;
      let strikeIncrement = 0;
      if (index === INDICES.NIFTY || index === INDICES.FINNIFTY) {
        strikeVariance = 50;
      } else if (index === INDICES.BANKNIFTY || index === INDICES.SENSEX) {
        strikeVariance = 100;
      } else if (index === INDICES.MIDCPNIFTY) {
        strikeVariance = 25;
      }
      strikeIncrement = strikeVariance;
      let ceHedge = await doOrderByStrike(atmStrike + hedgeVariance, OptionType.CE, 'BUY', true);
      while (typeof ceHedge === 'boolean' && ceHedge === false) {
        ceHedge = await doOrderByStrike(atmStrike + hedgeVariance + strikeIncrement, OptionType.CE, 'BUY', true);
        strikeIncrement += strikeVariance;
      }
      let peHedge = await doOrderByStrike(atmStrike - hedgeVariance, OptionType.PE, 'BUY', true);
      while (typeof peHedge === 'boolean' && peHedge === false) {
        peHedge = await doOrderByStrike(atmStrike - hedgeVariance - strikeIncrement, OptionType.PE, 'BUY', true);
        strikeIncrement -= strikeVariance;
      }
    }
    await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
    await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
  } catch (error) {
    const errorMessage = `${ALGO}: shortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
/**
 * Checks if both CE and PE options are present for a strike.
 * @param {BothPresent} data - An object indicating the presence of CE and PE options.
 * @returns {CheckOptionType} The result of the check.
 */
const checkBoth_CE_PE_Present = (data: BothPresent) => {
  if (data.ce && data.pe) return CheckOptionType.BOTH_CE_PE_PRESENT;
  else if (!data.ce && !data.pe) return CheckOptionType.BOTH_CE_PE_NOT_PRESENT;
  else if (!data.ce && data.pe) return CheckOptionType.ONLY_PE_PRESENT;
  else return CheckOptionType.ONLY_CE_PRESENT;
};
/**
 * Checks and manages both legs of a straddle.
 * @param {checkBothLegsType} params - The parameters for checking the legs.
 * @returns {Promise<void>}
 */
const checkBothLegs = async ({ cepe_present, atmStrike }: checkBothLegsType) => {
  try {
    if (cepe_present === CheckOptionType.BOTH_CE_PE_NOT_PRESENT) {
      console.log(`${ALGO}: Both legs not present, selling both!`);
      await shortStraddle();
    } else if (cepe_present === CheckOptionType.ONLY_CE_PRESENT) {
      console.log(`${ALGO}: only calls present, selling puts`);
      const token = await getScrip({
        scriptName: OrderStore.getInstance().getPostData().INDEX,
        expiryDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
        optionType: OptionType.PE,
        strikePrice: atmStrike.toString(),
      });
      console.log(`${ALGO}: token: `, token);
      const ltpData = await getLtpData({
        exchange: _get(token, '0.exch_seg', ''),
        symboltoken: _get(token, '0.token', ''),
        tradingsymbol: _get(token, '0.symbol', ''),
      });
      console.log(`${ALGO}: ltpData: `, ltpData.ltp);
      if (ltpData.ltp > 5) {
        console.log(`${ALGO}: As ltp is greater then 5, selling puts again`);
        await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
      }
    } else if (cepe_present === CheckOptionType.ONLY_PE_PRESENT) {
      console.log(`${ALGO}: only puts present, selling calls`);
      const token = await getScrip({
        scriptName: OrderStore.getInstance().getPostData().INDEX,
        expiryDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
        optionType: OptionType.CE,
        strikePrice: atmStrike.toString(),
      });
      console.log(`${ALGO}: token: `, token);
      const ltpData = await getLtpData({
        exchange: _get(token, '0.exch_seg', ''),
        symboltoken: _get(token, '0.token', ''),
        tradingsymbol: _get(token, '0.symbol', ''),
      });
      console.log(`${ALGO}: ltpData: `, ltpData.ltp);
      if (ltpData.ltp > 5) {
        console.log(`${ALGO}: As ltp is greater then 5, selling calls again`);
        await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
      }
    } else {
      console.log(`${ALGO}: Both legs of the atm strike present, no need to worry!`);
    }
  } catch (error) {
    const errorMessage = `${ALGO}: checkBothLegs failed ...`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
/**
 * Repeats the short straddle strategy if conditions are met.
 * @param {number} difference - The difference between the current ATM strike and the traded strike.
 * @param {number} atmStrike - The current ATM strike price.
 * @returns {Promise<void>}
 */
const repeatShortStraddle = async (difference: number, atmStrike: number) => {
  try {
    const idx = OrderStore.getInstance().getPostData().INDEX;
    const strikeDiff = getStrikeDifference(idx);
    console.log(`${ALGO}: strikeDiff: ${strikeDiff}`);
    console.log(`${ALGO}: difference: ${Math.abs(difference)}`);
    const positions = await getPositionsJson();
    const isSameStrikeAlreadyTraded = checkStrike(positions, atmStrike.toString());
    console.log(
      `${ALGO}: checking conditions\n\t1. if the difference is more or equal to strikeDiff (${strikeDiff}): ${
        Math.abs(difference) >= strikeDiff
      }\n\t2. if this same strike is already traded: ${isSameStrikeAlreadyTraded}`
    );
    const result = areBothOptionTypesPresentForStrike(positions, atmStrike.toString());
    console.log(`${ALGO}: areBothOptionTypesPresentForStrike: `, result);
    const cepe_present = checkBoth_CE_PE_Present(result);
    if (Math.abs(difference) >= strikeDiff && isSameStrikeAlreadyTraded === false) {
      console.log(`${ALGO}: executing trade repeat ...`);
      checkBothLegs({ cepe_present, atmStrike });
    } else if (difference === 0 && isSameStrikeAlreadyTraded) {
      //Code to re-enter  in the same strike
      console.log(`${ALGO}: same strike already traded checking both legs ...`);
      checkBothLegs({ cepe_present, atmStrike });
    }
  } catch (error) {
    const errorMessage = `${ALGO}: repeatShortStraddle failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
// const getPositionByToken = ({ positions, token }: getPositionByTokenType) => {
//   for (const position of positions) {
//     if (position.symboltoken === token) {
//       return position;
//     }
//   }
//   return null;
// };
// const findTradeByStrike = async (tradeStrike: number) => {
//   const positions = await getPositionsJson();
//   for (const position of positions) {
//     const strike = parseInt(position.strikeprice);
//     if (strike === tradeStrike) return position;
//   }
//   return null;
// };
// const shouldCloseTrade = async ({ ltp, avg, trade }: shouldCloseTradeType) => {
//   const thresholdPrice = avg * 3;
//   const hasPriceCrossedThreshold = parseInt(trade.netqty) < 0 && ltp >= thresholdPrice;
//   const isLtpBelowOne = parseInt(trade.netqty) < 0 && ltp < 1;
//   console.log(
//     `${ALGO}: checking shouldCloseTrade, trade strike: ${trade.strikeprice}, trade option type: ${trade.optiontype}, ltp: ${ltp}, thresholdPrice: ${thresholdPrice}`
//   );
//   if (hasPriceCrossedThreshold || isLtpBelowOne) {
//     console.log(`${ALGO}: Yes, close this particular trade with strike price ${trade.strikeprice}`);
//     try {
//       await closeParticularTrade({ trade });
//     } catch (error) {
//       console.log(`${ALGO}: closeParticularTrade could not be called`);
//       throw error;
//     }
//   }
// };
// const checkPositionToClose = async ({ openPositions }: checkPositionToCloseType) => {
//   console.log(`${ALGO}: checkPositionToClose`);
//   try {
//     for (const position of openPositions) {
//       if (
//         position &&
//         position.exchange === 'NFO' &&
//         position.tradingsymbol &&
//         position.sellavgprice &&
//         parseInt(position.netqty) < 0
//       ) {
//         const currentLtpPrice = getPositionByToken({
//           positions: openPositions,
//           token: position.symboltoken,
//         })?.ltp;
//         await shouldCloseTrade({
//           ltp: typeof currentLtpPrice === 'string' ? parseFloat(currentLtpPrice) : 0,
//           avg: parseFloat(position.sellavgprice),
//           trade: position,
//         });
//       }
//     }
//   } catch (error) {
//     const errorMessage = `${ALGO}: checkPositionToClose failed error below`;
//     console.log(errorMessage);
//     console.log(error);
//     throw error;
//   }
// };
/**
 * Fetches the open positions.
 * @param {boolean} [isAbrupt=false] - Whether to fetch all open positions or only sell positions.
 * @returns {Promise<Position[]>} A promise that resolves with the open positions.
 */
const getPositionsJson = async (isAbrupt = false) => {
  try {
    const smartSession = await getSmartSession();
    const cred = getCredentials();
    await delay({ milliSeconds: DELAY });
    const positions: Position[] = await getPositions(smartSession, cred);
    const openPositions = isAbrupt ? getAllOpenPositions(positions) : getOpenSellPositions(positions);
    console.log(`${ALGO}: total open positions are ${openPositions.length}`);
    return openPositions;
  } catch (error) {
    const errorMessage = `${ALGO}: getPositionsJson failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
/**
 * Closes a particular trade.
 * @param {{ trade: Position }} params - The trade to close.
 * @returns {Promise<void>}
 */
const closeParticularTrade = async ({ trade }: { trade: Position }) => {
  try {
    await delay({ milliSeconds: DELAY });
    const netQty = parseInt(trade.netqty);
    const tradingsymbol = trade.tradingsymbol;
    const transactionType = netQty < 0 ? TRANSACTION_TYPE_BUY : TRANSACTION_TYPE_SELL;
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
/**
 * Closes all open trades.
 * @param {boolean} [isAbrupt=false] - Whether to close all trades abruptly or only sell trades with LTP > 5.
 * @returns {Promise<void>}
 */
const closeAllTrades = async (isAbrupt = false) => {
  try {
    await delay({ milliSeconds: DELAY });
    const positions = await getPositionsJson(isAbrupt);
    if (Array.isArray(positions)) {
      for (const position of positions) {
        if (isAbrupt && parseInt(position.netqty) !== 0) {
          await closeParticularTrade({ trade: position });
        } else if (!isAbrupt) {
          const ltpData = await getLtpData({
            exchange: position.exchange,
            tradingsymbol: position.tradingsymbol,
            symboltoken: position.symboltoken,
          });

          console.log(`${ALGO}: position: `, position);
          console.log(`${ALGO}: ltpData: `, ltpData);

          const isNetqtyNegative = parseInt(position.netqty) < 0;
          const isLtpGreaterThanFive = ltpData && ltpData.ltp > 5;

          if (isNetqtyNegative && isLtpGreaterThanFive) {
            await closeParticularTrade({ trade: position });
          }
        }
      }
    }
  } catch (error) {
    const errorMessage = `${ALGO}: closeAllTrades failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
};
/**
 * Ensures all trades are closed and records the trade.
 * @param {boolean} [isAbrupt=false] - Whether to close trades abruptly.
 * @returns {Promise<void>}
 */
const closeTrade = async (isAbrupt = false) => {
  console.log(`${ME}: check if all the trades are closed.`);
  while ((await getPositionsJson(isAbrupt)).length > 0) {
    console.log(`${ALGO}: all trades are not closed, closing trades...`);
    await closeAllTrades(isAbrupt);
  }
  console.log(`${ALGO}: Yes, all the trades are closed.`);
  const mtm = await getMtm();
  await recordNewTrade({
    indices: OrderStore.getInstance().getPostData().INDEX,
    brokerageWithTax: 0,
    mtm: mtm,
    ordersExecuted: 0,
    tradeDate: moment().format('DDMMMYYYY').toUpperCase(),
  });
};
/**
 * Checks if the short straddle strategy should be repeated.
 * @param {number} atmStrike - The current ATM strike price.
 * @param {number} previousTradeStrikePrice - The previously traded strike price.
 * @returns {Promise<void>}
 */
const checkToRepeatShortStraddle = async (atmStrike: number, previousTradeStrikePrice: number) => {
  console.log(`${ALGO}: atm strike price is ${atmStrike}. previous traded strike price is ${previousTradeStrikePrice}`);
  if (isFinite(atmStrike)) {
    const difference = atmStrike - previousTradeStrikePrice;
    await delay({ milliSeconds: DELAY });
    await repeatShortStraddle(difference, atmStrike);
    if (atmStrike > previousTradeStrikePrice) {
      console.log(
        `${ALGO}: atm strike is greater than previously traded strike price. The difference is ${difference}`
      );
    } else if (atmStrike < previousTradeStrikePrice) {
      console.log(`${ALGO}: atm strike is lesser than previously traded strike price. The difference is ${difference}`);
    } else {
      console.log(`${ALGO}: atm strike is equal to previously traded strike price. The difference is ${difference}`);
    }
  } else {
    console.log(`${ALGO}: Oops, 'atmStrike' is infinity! Stopping operations.`);
    throw new Error(`Oops, atmStrike is infinity! Stopping operations.`);
  }
};
/**
 * Executes the core trading logic.
 * @param {{ data: Position[] }} params - The open positions.
 * @returns {Promise<void>}
 */
const coreTradeExecution = async ({ data }: { data: Position[] }) => {
  const isTradeAlreadyTaken = Array.isArray(data) && data.length > 0;
  if (isTradeAlreadyTaken === false) {
    console.log(`${ALGO}: executing trade`);
    await shortStraddle(true);
  } else {
    console.log(`${ALGO}: trade executed already checking conditions to repeat the trade`);
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice();
    const no_of_trades = data.length;
    const previousTradeStrikePrice: string | number = getNearestStrike({
      algoTrades: data,
      atmStrike: atmStrike,
      expirationDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
    });
    console.log(
      `${ALGO}: atmStrike is ${atmStrike}, no of trades taken are ${no_of_trades}, previously traded  strike price is ${previousTradeStrikePrice}`
    );
    await checkToRepeatShortStraddle(atmStrike, previousTradeStrikePrice);
  }
};
/**
 * Calculates the Mark-to-Market (MTM) for the traded positions.
 * @returns {Promise<number>} A promise that resolves with the MTM value.
 */
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
/**
 * Executes the main trading logic for the day.
 * @returns {Promise<number | string>} A promise that resolves with the MTM value or a message.
 */
const executeTrade = async () => {
  let resp: number | string = `${ALGO}: Trade Closed`;
  const closingTime: TimeComparisonType = { hours: 15, minutes: 17 };
  const isPastClosingTime = isCurrentTimeGreater(closingTime);
  //const isPastClosingTime = false; //HARDCODED FOR TESTING
  // const marginDetails = await getMarginDetails();
  // console.log(`${ALGO}: marginDetails: `, marginDetails);
  // const quantity = OrderStore.getInstance().getPostData().QUANTITY;
  // const lossPerLot = OrderStore.getInstance().getPostData().LOSSPERLOT;
  const calculatedFixStopLoss = 12000;
  console.log(`${ALGO}: calculatedFixStopLoss: ${calculatedFixStopLoss}`);
  const mtmData = await getMtm();
  console.log(`${ALGO}: MTM: ${mtmData} -----`);
  // let isStoplossExceeded = Math.abs(mtmData) > calculatedFixStopLoss;
  const isStoplossExceeded = false;
  console.log(`${ALGO}: isStoplossExceeded: ${isStoplossExceeded}`);
  console.log(`${ALGO}: isPastClosingTime: ${isPastClosingTime}`);
  const data = await getPositionsJson();
  //await checkPositionToClose({ openPositions: data });
  if (isPastClosingTime === false && isStoplossExceeded === false) {
    await coreTradeExecution({ data });
    resp = mtmData;
  }
  // if (isStoplossExceeded && getAllOpenPositions(data).length > 0) await closeTrade(true);
  if (isPastClosingTime && getOpenSellPositions(data).length > 0) await closeTrade(false);
  return resp;
};
/**
 * Checks if trading is allowed based on market conditions.
 * @param {number} indiaVix - The current India VIX value.
 * @returns {Promise<boolean>} A promise that resolves with a boolean indicating if trading is allowed.
 */
const isTradeAllowed = async (indiaVix: number) => {
  const isMarketOpen = !isMarketClosed();
  const isWeekend = moment().day() === 0 || moment().day() === 6;
  const isHoliday = isTradingHoliday();
  const expiryDate = getTodayExpiry();
  const lastWednesday = getLastWednesdayOfMonth();
  const isTodayLastWednesdayOfMonth =
    lastWednesday !== null && expiryDate === lastWednesday.format(DATEFORMAT).toUpperCase();

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
    `${ALGO}: checking conditions, isWeekend: ${isWeekend}, is indiaVix > 15: ${indiaVix}, isHoliday: ${isHoliday}, isMarketOpen: ${isMarketOpen}, hasTimePassed 09:45am: ${hasTimePassedToTakeTrade}, isSmartAPIWorking: ${isSmartAPIWorking}`
  );
  return (
    isWeekend === false &&
    indiaVix > 15 &&
    isMarketOpen &&
    hasTimePassedToTakeTrade &&
    isSmartAPIWorking &&
    isHoliday === false &&
    isTodayLastWednesdayOfMonth === false
  );
};
/**
 * Checks market conditions and executes the trade if allowed.
 * @param {number} [lots=LOTS] - The number of lots to trade.
 * @param {number} [lossPerLot=LOSSPERLOT] - The loss per lot.
 * @returns {Promise<any>} A promise that resolves with the result of the trade execution.
 */
export const checkMarketConditionsAndExecuteTrade = async (lots: number = LOTS, lossPerLot: number = LOSSPERLOT) => {
  //let expiryDate = '30MAY2024'; //HARDCODED FOR TESTING
  //const orderBook = await getOrderBook();
  //console.log(orderBook);
  const expiryDate = getTodayExpiry();
  const indiaVix = await getIndexScrip({ scriptName: 'INDIA VIX' });
  await delay({ milliSeconds: DELAY });
  await delay({ milliSeconds: DELAY });
  const indiaVixLtp = await getLtpData({
    exchange: indiaVix[0].exch_seg,
    symboltoken: indiaVix[0].token,
    tradingsymbol: indiaVix[0].symbol,
  });
  await delay({ milliSeconds: DELAY });
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
  console.log(`${ALGO}: OrderStore data: `, OrderStore.getInstance().getPostData());
  try {
    // await isTradeAllowed(); //HARDCODED FOR TESTING
    // return await executeTrade(); //HARDCODED FOR TESTING
    const isAllowed = await isTradeAllowed(indiaVixLtp.ltp);
    if (isAllowed === false) return MESSAGE_NOT_TAKE_TRADE;
    else return await executeTrade();
  } catch (err) {
    return err;
  }
};
/**
 * Checks if a position with the same strike and option type already exists.
 * @param {CheckPosition} params - The position and trades to check against.
 * @returns {Promise<boolean>} A promise that resolves with a boolean indicating if the position exists.
 */
export const checkPositionAlreadyExists = async ({ position, trades }: CheckPosition) => {
  for (const trade of trades) {
    if (parseInt(trade.strike) === parseInt(position.strikeprice) && trade.optionType === position.optiontype)
      return true;
  }
  return false;
};
