import { get as _get, isArray, isEmpty } from 'lodash';
import {
  CREDENTIALS,
  DELAY,
  delay,
  generateSmartSession,
  getCredentials,
  getNearestStrike,
  getScripName,
  getSmartSession,
  isCurrentTimeGreater,
  isTradingHoliday,
} from 'krb-smart-api-module';
import {
  areBothOptionTypesPresentForStrike,
  checkStrike,
  countSellPairs,
  getAllOpenPositions,
  getAtmStrikePrice,
  getOpenPositionsByExpiry,
  getOpenSellPositions,
  getStrikeDifference,
  hasHedgePositions,
  hasOpenPositionForStrike,
  hedgeCalculation,
  isMarketClosed,
} from './functions';
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
  GET_LTP_DATA_API,
  GET_ORDER_BOOK_API,
  GET_POSITIONS,
  LOSSPERLOT,
  LOTS,
  ME,
  MESSAGE_NOT_TAKE_TRADE,
  ORDER_API,
  PENDING_ORDER_STATUS,
  SCRIPMASTER,
  SEARCHSCRIPAPI,
  TRANSACTION_TYPE_BUY,
  TRANSACTION_TYPE_SELL,
  VARIETY_STOPLOSS,
} from './constants';
import DataStore from '../store/dataStore';
import OrderStore from '../store/orderStore';
import ScripMasterStore from '../store/scripMasterStore';
import moment from 'moment-timezone';
import { get, post } from './api';

/**
 * Gets the nearest weekly expiry date for a given index (NIFTY or BANKNIFTY).
 * Returns the date in the scrip master format e.g. "20FEB2025"
 */
export const getNearestWeeklyExpiry = async (scriptName: 'NIFTY' | 'BANKNIFTY' = 'NIFTY'): Promise<string> => {
  const scripMaster: scripMasterResponse[] = await fetchData();

  const today = moment().startOf('day');

  // Filter only OPTIDX options for the given index on NFO
  const options = scripMaster.filter(scrip => {
    const name: string = scrip.name || '';
    return (
      name === scriptName && scrip.exch_seg === 'NFO' && scrip.instrumenttype === 'OPTIDX' && scrip.expiry // must have expiry
    );
  });

  if (!options.length) {
    throw new Error(`No options found for ${scriptName} in scrip master`);
  }

  // Parse expiry strings like "20FEB2025" → moment date
  const parsedExpiries = options
    .map(scrip => ({
      raw: scrip.expiry, // original string e.g. "20FEB2025"
      date: moment(scrip.expiry, 'DDMMMYYYY'), // parse to moment
    }))
    .filter(e => e.date.isSameOrAfter(today)) // only today or future
    .sort((a, b) => a.date.valueOf() - b.date.valueOf()); // sort ascending

  if (!parsedExpiries.length) {
    throw new Error(`No upcoming expiry dates found for ${scriptName}`);
  }

  // The first one is the nearest weekly expiry
  const nearest = parsedExpiries[0];
  console.log(`${ALGO}: Nearest weekly expiry for ${scriptName}: ${nearest.raw}`);

  return nearest.raw; // returns e.g. "20FEB2025"
};

export const getLtpWithRetry = async ({
  exchange,
  symboltoken,
  tradingsymbol,
  maxRetries = 5,
  delayMs = 1000,
}: {
  exchange: string;
  symboltoken: string;
  tradingsymbol: string;
  maxRetries?: number;
  delayMs?: number;
}): Promise<LtpDataType> => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const ltpData: LtpDataType = await getLtpData({ exchange, symboltoken, tradingsymbol });

      if (ltpData?.ltp !== undefined && ltpData?.ltp !== null && ltpData.ltp > 0) {
        return ltpData;
      }

      console.warn(
        `${ALGO}: getLtpWithRetry — invalid LTP for ${tradingsymbol} on attempt ${attempt + 1}/${maxRetries}, got: ${ltpData?.ltp}`,
      );
    } catch (error) {
      console.warn(`${ALGO}: getLtpWithRetry — error on attempt ${attempt + 1}/${maxRetries}:`, error);

      // Rethrow immediately on last attempt
      if (attempt + 1 >= maxRetries) throw error;
    }

    // ── Exponential backoff: 1s → 2s → 4s → 8s → 16s ──
    const backoffMs = delayMs * Math.pow(2, attempt);
    console.warn(
      `${ALGO}: getLtpWithRetry — retrying ${tradingsymbol} in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`,
    );
    await delay({ milliSeconds: backoffMs });

    attempt++;
  }

  throw new Error(`${ALGO}: getLtpWithRetry — no valid LTP for ${tradingsymbol} after ${maxRetries} attempts`);
};

/**
 * Fetches the Last Traded Price (LTP) for a given scrip.
 * @param {getLtpDataType} params - The parameters for fetching LTP data.
 * @returns {Promise<LtpDataType>} A promise that resolves with the LTP data.
 */
export const getLtpData = async ({ exchange, tradingsymbol, symboltoken }: getLtpDataType): Promise<LtpDataType> => {
  const smartApiData: ISmartApiData = await getSmartSession();
  const jwtToken = _get(smartApiData, 'jwtToken');
  const data = { exchange, tradingsymbol, symboltoken };
  const cred = DataStore.getInstance().getPostData();
  const headers = {
    Authorization: `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
    'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
    'X-MACAddress': 'MAC_ADDRESS',
    'X-PrivateKey': cred.APIKEY,
  };
  try {
    const response = await post(GET_LTP_DATA_API, data, headers);
    const responseData = _get(response, 'data', null);

    // Safety: handle both response shapes
    const ltp = _get(responseData, 'ltp', undefined);
    console.log(
      `${ALGO}: getLtpData raw response for ${tradingsymbol} — ltp: ${ltp}, full data: ${JSON.stringify(responseData)}`,
    );

    return responseData || {};
  } catch (error) {
    console.log(`${ALGO}: the GET_LTP_DATA_API failed error below`);
    console.log(error);
    throw error;
  }
};
/**
 * Searches for a scrip by its name.
 * @param {string} scripName - The name of the scrip to search for.
 * @param {string} exchange - The exchange to search in (NFO, NSE, BSE, etc.). Defaults to 'NFO'.
 * @returns {Promise<any>} A promise that resolves with the search results.
 */
export const searchScrip = async (scripName: string, exchange: string = 'NFO') => {
  const smartApiData: ISmartApiData = await getSmartSession();
  const jwtToken = _get(smartApiData, 'jwtToken');
  const cred = DataStore.getInstance().getPostData();
  const headers = {
    Authorization: `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
    'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
    'X-MACAddress': 'MAC_ADDRESS',
    'X-PrivateKey': cred.APIKEY,
  };
  const data = { exchange, searchscrip: scripName };
  const response = await post(SEARCHSCRIPAPI, data, headers);
  return _get(response, 'data', '');
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
    try {
      console.log(`${ALGO}: 📥 Downloading Scrip Master...`);
      const response = (await get(SCRIPMASTER, {})) as scripMasterResponse[];
      const acData: scripMasterResponse[] = response;
      console.log(`${ALGO}: response if script master api loaded and its length is ${acData.length}`);
      ScripMasterStore.getInstance().setPostData({
        SCRIP_MASTER_JSON: acData,
      });
      return acData;
    } catch (error) {
      console.log(`${ALGO}: fetchData failed error below`);
      console.log(error);
      throw error;
    }
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
    }`,
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
export const doOrder = async ({
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
  exchange = 'NFO',
  quantity: providedQuantity,
  lots,
}: Omit<doOrderType, 'lotSize'> & {
  exchange?: string;
  quantity?: number;
  lots?: number;
  lotSize?: number;
}): Promise<doOrderResponse> => {
  const smartApiData: ISmartApiData = await getSmartSession();
  const jwtToken = _get(smartApiData, 'jwtToken');

  // Calculate quantity - use provided quantity if given, otherwise calculate from lots/lotSize
  let quantity: number;
  if (providedQuantity === undefined) {
    if (!lotSize || lotSize <= 0) {
      throw new Error('Either quantity or lotSize must be provided');
    }
    const storedLots = lots || OrderStore.getInstance().getPostData().QUANTITY || 1;
    const hedgeQuantity = storedLots * 5;
    const lotsCalc = isHedge ? hedgeQuantity : storedLots;
    console.log(`${ALGO} {doOrder}: isHedge: ${isHedge}, lotsCalc: ${lotsCalc}, hedgeQuantity: ${hedgeQuantity}`);
    quantity = Math.abs(lotSize * lotsCalc);
  } else {
    quantity = Math.abs(providedQuantity);
  }
  const data = {
    exchange,
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
  };
  console.log(`${ALGO} doOrder data `, data);
  const cred = DataStore.getInstance().getPostData();
  const headers = {
    Authorization: `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
    'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
    'X-MACAddress': 'MAC_ADDRESS',
    'X-PrivateKey': cred.APIKEY,
  };
  try {
    const response = await post(ORDER_API, data, headers);
    return response;
  } catch (error) {
    const errorMessage = `${ALGO}: doOrder failed error below`;
    console.log(errorMessage);
    console.log(error);
    throw error;
  }
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
  isHedge = false,
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
      lotSize: Number.parseInt(lotsize),
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
      if (index === INDICES.NIFTY) {
        strikeVariance = 50;
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
      }\n\t2. if this same strike is already traded: ${isSameStrikeAlreadyTraded}`,
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

export const getPositions = async (
  smartSession: ISmartApiData,
  cred: CREDENTIALS,
  maxRetries: number = 5,
  delayMs: number = 1000,
): Promise<Position[]> => {
  const headers = {
    Authorization: `Bearer ${smartSession.jwtToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
    'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
    'X-MACAddress': 'MAC_ADDRESS',
    'X-PrivateKey': cred.APIKEY,
  };

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(GET_POSITIONS, {
        method: 'get',
        headers,
      });
      await delay({ milliSeconds: DELAY });
      const responseJson = await response.json();

      if (response.status >= 200 && response.status < 300) {
        const positions = _get(responseJson, 'data', []) as Position[];

        if (Array.isArray(positions)) {
          console.log(
            `${ALGO}: getPositions — success on attempt ${attempt + 1}, total positions: ${positions.length}`,
          );
          return positions;
        }

        console.warn(
          `${ALGO}: getPositions — invalid data shape on attempt ${attempt + 1}/${maxRetries}, got: ${JSON.stringify(positions)}`,
        );
      } else {
        console.warn(`${ALGO}: getPositions — HTTP ${response.status} on attempt ${attempt + 1}/${maxRetries}`);
      }
    } catch (error) {
      console.warn(`${ALGO}: getPositions — error on attempt ${attempt + 1}/${maxRetries}:`, error);
      if (attempt + 1 >= maxRetries) throw error;
    }

    // ── Exponential backoff: 1s → 2s → 4s → 8s → 16s ──
    const backoffMs = delayMs * Math.pow(2, attempt);
    console.log(`${ALGO}: getPositions — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`);
    await delay({ milliSeconds: backoffMs });

    attempt++;
  }

  throw new Error(`${ALGO}: getPositions — failed to get valid positions after ${maxRetries} attempts`);
};

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
 * Fetches open positions filtered by index and expiry — standalone, no OrderStore dependency.
 * @param {string} index - e.g. 'NIFTY'
 * @param {string} expiryDate - e.g. '17FEB2026'
 * @param {'ALL' | 'SELL' | 'BUY'} type - Filter type (default: 'ALL')
 */
export const fetchOpenPositionsByExpiry = async (
  index: string,
  expiryDate: string,
  type: 'ALL' | 'SELL' | 'BUY' = 'ALL',
): Promise<Position[]> => {
  const smartSession = await getSmartSession();
  const cred = getCredentials();
  await delay({ milliSeconds: DELAY });

  const allPositions: Position[] = await getPositions(smartSession, cred);
  console.log(`${ALGO}: fetchOpenPositionsByExpiry — total raw positions: ${allPositions?.length ?? 0}`);

  if (!Array.isArray(allPositions) || allPositions.length === 0) return [];

  const filtered = getOpenPositionsByExpiry(allPositions, index, expiryDate, type);
  console.log(`${ALGO}: fetchOpenPositionsByExpiry — filtered (${index} ${expiryDate} ${type}): ${filtered.length}`);

  return filtered;
};

/**
 * Closes a particular trade.
 * @param {{ trade: Position }} params - The trade to close.
 * @returns {Promise<void>}
 */
const closeParticularTrade = async ({ trade }: { trade: Position }) => {
  try {
    await delay({ milliSeconds: DELAY });
    const netQty = Number.parseInt(trade.netqty);
    const tradingsymbol = trade.tradingsymbol;
    const transactionType = netQty < 0 ? TRANSACTION_TYPE_BUY : TRANSACTION_TYPE_SELL;
    const symboltoken = trade.symboltoken;
    const lotSize = Number.parseInt(trade.lotsize);
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
        if (isAbrupt && Number.parseInt(position.netqty) !== 0) {
          await closeParticularTrade({ trade: position });
        } else if (!isAbrupt) {
          const ltpData = await getLtpData({
            exchange: position.exchange,
            tradingsymbol: position.tradingsymbol,
            symboltoken: position.symboltoken,
          });

          console.log(`${ALGO}: position: `, position);
          console.log(`${ALGO}: ltpData: `, ltpData);

          const isNetqtyNegative = Number.parseInt(position.netqty) < 0;
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
  console.log(`${ALGO}: mtm is ${mtm}`);
};
/**
 * Checks if the short straddle strategy should be repeated.
 * @param {number} atmStrike - The current ATM strike price.
 * @param {number} previousTradeStrikePrice - The previously traded strike price.
 * @returns {Promise<void>}
 */
const checkToRepeatShortStraddle = async (atmStrike: number, previousTradeStrikePrice: number) => {
  console.log(`${ALGO}: atm strike price is ${atmStrike}. previous traded strike price is ${previousTradeStrikePrice}`);
  if (Number.isFinite(atmStrike)) {
    const difference = atmStrike - previousTradeStrikePrice;
    await delay({ milliSeconds: DELAY });
    await repeatShortStraddle(difference, atmStrike);
    if (atmStrike > previousTradeStrikePrice) {
      console.log(
        `${ALGO}: atm strike is greater than previously traded strike price. The difference is ${difference}`,
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
      `${ALGO}: atmStrike is ${atmStrike}, no of trades taken are ${no_of_trades}, previously traded  strike price is ${previousTradeStrikePrice}`,
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
        const unrealised = Number.parseFloat(position.unrealised);
        const realised = Number.parseFloat(position.realised);
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
  const mtmData = await getMtm();
  console.log(`${ALGO}: MTM: ${mtmData} -----`);
  console.log(`${ALGO}: isPastClosingTime: ${isPastClosingTime}`);
  const data = await getPositionsJson();
  if (isPastClosingTime === false) {
    await coreTradeExecution({ data });
    await placeStopLossOnAllTrades();
    resp = mtmData;
  }
  if (isPastClosingTime && getOpenSellPositions(data).length > 0) await closeTrade(false);
  return resp;
};
/**
 * Checks if trading is allowed based on market conditions.
 * @returns {Promise<{isAllowed: boolean, reasons: string[]}>} A promise that resolves with a boolean and detailed reasons if not allowed.
 */
const isTradeAllowed = async () => {
  const isMarketOpen = !isMarketClosed();
  const isWeekend = moment().day() === 0 || moment().day() === 6;
  const isHoliday = isTradingHoliday();
  const isTuesday = moment().day() === 2; // Tuesday
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
    console.log('Error occurred for generateSmartSession:', err);
  }
  console.log(
    `${ALGO}: checking conditions, isWeekend: ${isWeekend}, isHoliday: ${isHoliday}, isMarketOpen: ${isMarketOpen}, hasTimePassed 09:45am: ${hasTimePassedToTakeTrade}, isSmartAPIWorking: ${isSmartAPIWorking}, isTuesday: ${isTuesday}`,
  );

  const reasons: string[] = [];
  if (!isTuesday) reasons.push('It is not Tuesday');
  if (isWeekend) reasons.push('It is a weekend');
  if (!isMarketOpen) reasons.push('Market is closed');
  if (!hasTimePassedToTakeTrade) reasons.push('Time has not passed 09:15 AM');
  if (!isSmartAPIWorking) reasons.push('Smart API is not working');
  if (isHoliday) reasons.push('Today is a trading holiday');

  const isAllowed =
    isTuesday === true &&
    isWeekend === false &&
    isMarketOpen &&
    hasTimePassedToTakeTrade &&
    isSmartAPIWorking &&
    isHoliday === false;
  return { isAllowed, reasons };
};
/**
 * Checks market conditions and executes the trade if allowed.
 * @param {number} [lots=LOTS] - The number of lots to trade.
 * @param {number} [lossPerLot=LOSSPERLOT] - The loss per lot.
 * @returns {Promise<any>} A promise that resolves with the result of the trade execution.
 */
export const checkMarketConditionsAndExecuteTrade = async (lots: number = LOTS, lossPerLot: number = LOSSPERLOT) => {
  const expiryDate = await getNearestWeeklyExpiry('NIFTY');
  const indiaVix = await getIndexScrip({ scriptName: 'INDIA VIX' });
  const indiaVixLtp = await getLtpData({
    exchange: indiaVix[0].exch_seg,
    symboltoken: indiaVix[0].token,
    tradingsymbol: indiaVix[0].symbol,
  });
  console.log(`${ALGO}: INDIA VIX ltp is ${indiaVixLtp.ltp}`);
  OrderStore.getInstance().setPostData({
    QUANTITY: lots,
    EXPIRYDATE: expiryDate,
    INDEX: getScripName(expiryDate),
    LOSSPERLOT: lossPerLot,
    INDIAVIX: indiaVixLtp.ltp,
  });
  console.log(`${ALGO}: OrderStore data: `, OrderStore.getInstance().getPostData());
  try {
    const { isAllowed, reasons } = await isTradeAllowed();
    if (isAllowed === false) {
      const detailedMessage = `${MESSAGE_NOT_TAKE_TRADE}. Reason(s): ${reasons.join(', ')}`;
      console.log(`${ALGO}: ${detailedMessage}`);
      return detailedMessage;
    } else return await executeTrade();
  } catch (err) {
    return err;
  }
};
/**
 * Checks market conditions without executing the trade.
 * @returns {Promise<any>} A promise that resolves with the market conditions check result.
 */
export const checkMarketConditions = async () => {
  const expiryDate = await getNearestWeeklyExpiry('NIFTY');
  const indiaVix = await getIndexScrip({ scriptName: 'INDIA VIX' });
  console.log(`${ALGO}: indiaVix: `, indiaVix);
  const indiaVixLtp = await getLtpData({
    exchange: indiaVix[0].exch_seg,
    symboltoken: indiaVix[0].token,
    tradingsymbol: indiaVix[0].symbol,
  });
  await delay({ milliSeconds: DELAY });
  console.log(`${ALGO}: INDIA VIX ltp is ${indiaVixLtp.ltp}`);
  try {
    const { isAllowed, reasons } = await isTradeAllowed();
    return {
      conditions: {
        indiaVixLtp: indiaVixLtp.ltp,
        isAllowed,
        reasons,
        expiryDate,
      },
      message: isAllowed
        ? 'Market conditions are favorable for trading'
        : `${MESSAGE_NOT_TAKE_TRADE}. Reason(s): ${reasons.join(', ')}`,
    };
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
    if (
      Number.parseInt(trade.strike) === Number.parseInt(position.strikeprice) &&
      trade.optionType === position.optiontype
    )
      return true;
  }
  return false;
};

/**
 * Fetches the pending orders from the order book.
 * @returns {Promise<Record<string, unknown>[]>} A promise that resolves with the list of pending orders.
 */
const getPendingOrders = async (): Promise<Record<string, unknown>[]> => {
  try {
    const smartApiData: ISmartApiData = await getSmartSession();
    const jwtToken = _get(smartApiData, 'jwtToken');
    const cred = DataStore.getInstance().getPostData();
    const headers = {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
      'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
      'X-MACAddress': 'MAC_ADDRESS',
      'X-PrivateKey': cred.APIKEY,
    };
    const response = await get(GET_ORDER_BOOK_API, headers);
    const orders = _get(response, 'data', []);
    // Filter for pending stop loss orders
    const pendingOrders = Array.isArray(orders)
      ? orders.filter(
          (order: Record<string, unknown>) =>
            _get(order, 'data.status', '') === PENDING_ORDER_STATUS &&
            _get(order, 'data.variety', '') === VARIETY_STOPLOSS,
        )
      : [];
    return pendingOrders;
  } catch (error) {
    const errorMessage = `${ALGO}: getPendingOrders failed error below`;
    console.log(errorMessage);
    console.log(error);
    return [];
  }
};

/**
 * Checks if a stop loss order already exists for a given position.
 * @param {Position} position - The position to check.
 * @param {Record<string, unknown>[]} pendingOrders - The list of pending orders.
 * @returns {boolean} True if a stop loss order exists for the position, false otherwise.
 */
const hasStopLossOrderForPosition = (position: Position, pendingOrders: Record<string, unknown>[]): boolean => {
  const tradingSymbol = position.tradingsymbol;
  const optionType = position.optiontype;
  const strikePrice = position.strikeprice;

  return pendingOrders.some(
    (order: Record<string, unknown>) =>
      _get(order, 'data.tradingsymbol', '') === tradingSymbol &&
      _get(order, 'data.optiontype', '') === optionType &&
      _get(order, 'data.optiontype', '') === optionType &&
      _get(order, 'data.strikeprice', '') === strikePrice,
  );
};

/**
 * Places a stop loss order for a single position.
 * @param {Position} position - The position to place a stop loss order for.
 * @param {number} stoplossPercentage - The stop loss percentage (default: 125 for 125%).
 * @returns {Promise<void>}
 */
const placeStopLossOrder = async (
  position: Position,
  stoplossPercentage: number = 125,
): Promise<doOrderResponse | null> => {
  try {
    await delay({ milliSeconds: DELAY });
    const netQty = Number.parseInt(position.netqty);
    const tradingsymbol = position.tradingsymbol;
    // If sold (netQty negative), we buy to close; if bought (netQty positive), we sell to close
    const transactionType = netQty < 0 ? TRANSACTION_TYPE_BUY : TRANSACTION_TYPE_SELL;
    if (transactionType === TRANSACTION_TYPE_BUY) {
      const symboltoken = position.symboltoken;
      const lotSize = Number.parseInt(position.lotsize);

      // Calculate stop loss price based on average price and percentage
      const entryPrice = Math.abs(Number.parseFloat(position.netvalue) / netQty);
      const stoplossPrice = entryPrice + entryPrice * (stoplossPercentage / 100);

      console.log(
        `${ALGO}: placeStopLossOrder for ${tradingsymbol} - entry price: ${entryPrice}, stoploss price: ${stoplossPrice}`,
      );

      const stoplossStatus = await doOrder({
        tradingsymbol,
        transactionType,
        symboltoken,
        lotSize,
        variety: VARIETY_STOPLOSS,
        ordertype: 'STOPLOSS_MARKET',
        price: stoplossPrice,
        triggerprice: stoplossPrice,
      });
      console.log(`${ALGO}: placeStopLossOrder status for ${tradingsymbol}:`, stoplossStatus);
      return stoplossStatus;
    }
    return null;
  } catch (error) {
    const errorMessage = `${ALGO}: placeStopLossOrder failed for ${position.tradingsymbol}`;
    console.log(errorMessage);
    console.log(error);
    return null;
  }
};

/**
 * Places stop loss orders on all open positions that don't already have one.
 * First fetches pending orders, then places stop loss only for positions without existing orders.
 * @param {number} stoplossPercentage - The stop loss percentage (default: 125 for 125%).
 * @returns {Promise<void>}
 */
export const placeStopLossOnAllTrades = async (stoplossPercentage: number = 125): Promise<void> => {
  try {
    console.log(`${ALGO}: Starting placeStopLossOnAllTrades with ${stoplossPercentage}% stop loss`);

    // Get existing pending orders
    const pendingOrders = await getPendingOrders();
    console.log(`${ALGO}: Found ${pendingOrders.length} existing pending stop loss orders`);

    // Get open positions (only sell positions)
    const positions = await getPositionsJson(false);
    console.log(`${ALGO}: Found ${positions.length} open sell positions`);

    if (!Array.isArray(positions) || positions.length === 0) {
      console.log(`${ALGO}: No open positions found, nothing to place stop loss orders for`);
      return;
    }

    // Filter positions that don't have a stop loss order yet
    const positionsWithoutStopLoss = positions.filter(
      (position: Position) => !hasStopLossOrderForPosition(position, pendingOrders),
    );
    console.log(
      `${ALGO}: ${positionsWithoutStopLoss.length} positions need stop loss orders (${positions.length - positionsWithoutStopLoss.length} already have them)`,
    );

    // Place stop loss orders for positions without them
    for (const position of positionsWithoutStopLoss) {
      await placeStopLossOrder(position, stoplossPercentage);
    }

    console.log(`${ALGO}: Completed placeStopLossOnAllTrades`);
  } catch (error) {
    const errorMessage = `${ALGO}: placeStopLossOnAllTrades failed`;
    console.log(errorMessage);
    console.log(error);
  }
};
/**
 * Core trade execution:
 * - First trade:      Buy 3L hedge CE+PE + Sell 1L ATM CE+PE
 * - Subsequent trade: Only sell 1L ATM CE+PE (hedges already in place)
 * - Blocked:          If 3 sell pairs already exist, do nothing
 *
 * @param index          - e.g. 'NIFTY'
 * @param expiry         - e.g. '17FEB2026'
 * @param atmStrike      - e.g. 25450
 * @param sellLots       - lots to sell at ATM (default: 1)
 * @param buyLots        - lots to buy for hedge, first trade only (default: 3)
 * @param hedgeDistance  - points away from ATM for hedge (default: 500)
 * @param maxSellPairs   - maximum allowed sell pairs before blocking (default: 3)
 */
export const executeSellAtmBuyHedge = async ({
  index,
  expiry,
  atmStrike,
  sellLots = 1,
  buyLots = 3,
  hedgeDistance = 500,
  maxSellPairs = 3,
}: {
  index: string;
  expiry: string;
  atmStrike: number;
  sellLots?: number;
  buyLots?: number;
  hedgeDistance?: number;
  maxSellPairs?: number;
}) => {
  // ── Step 1: Fetch all current open positions for this expiry ─────
  const allPositions = await fetchOpenPositionsByExpiry(index, expiry, 'ALL');

  const isFirstTrade = !hasHedgePositions(allPositions);
  const sellPairCount = countSellPairs(allPositions);

  console.log(
    `${ALGO}: executeSellAtmBuyHedge — isFirstTrade: ${isFirstTrade}, sellPairCount: ${sellPairCount}/${maxSellPairs}`,
  );

  // ── Step 2: Block if max sell pairs already reached ──────────────
  if (sellPairCount >= maxSellPairs) {
    console.log(`${ALGO}: executeSellAtmBuyHedge — max sell pairs (${maxSellPairs}) reached, blocking trade`);
    return {
      index,
      expiry,
      atmStrike,
      blocked: true,
      reason: `Max sell pairs (${maxSellPairs}) already reached. No new trade taken.`,
      sellPairCount,
      trades: [],
    };
  }

  // ── Step 3: Check if this ATM strike already sold ────────────────
  const isStrikeAlreadySold = hasOpenPositionForStrike(
    allPositions.filter(p => Number.parseInt(p.netqty) < 0),
    atmStrike,
  );

  if (isStrikeAlreadySold) {
    console.log(`${ALGO}: executeSellAtmBuyHedge — ATM strike ${atmStrike} already sold, skipping`);
    return {
      index,
      expiry,
      atmStrike,
      blocked: true,
      reason: `Strike ${atmStrike} already has open sell positions.`,
      sellPairCount,
      trades: [],
    };
  }

  // ── Step 4: Fetch required scrip tokens ─────────────────────────
  const ceHedgeStrike = atmStrike + hedgeDistance;
  const peHedgeStrike = atmStrike - hedgeDistance;

  console.log(`${ALGO}: executeSellAtmBuyHedge —`);
  if (isFirstTrade) {
    console.log(`${ALGO}:   [FIRST TRADE] BUY ${buyLots}L CE hedge @ ${ceHedgeStrike}`);
    console.log(`${ALGO}:   [FIRST TRADE] BUY ${buyLots}L PE hedge @ ${peHedgeStrike}`);
  }
  console.log(`${ALGO}:   SELL ${sellLots}L ATM CE @ ${atmStrike}`);
  console.log(`${ALGO}:   SELL ${sellLots}L ATM PE @ ${atmStrike}`);

  // Fetch ATM scrips always; hedge scrips only on first trade
  const scripPromises: Promise<scripMasterResponse[]>[] = [
    getScrip({ scriptName: index, expiryDate: expiry, optionType: OptionType.CE, strikePrice: atmStrike.toString() }),
    getScrip({ scriptName: index, expiryDate: expiry, optionType: OptionType.PE, strikePrice: atmStrike.toString() }),
    ...(isFirstTrade
      ? [
          getScrip({
            scriptName: index,
            expiryDate: expiry,
            optionType: OptionType.CE,
            strikePrice: ceHedgeStrike.toString(),
          }),
          getScrip({
            scriptName: index,
            expiryDate: expiry,
            optionType: OptionType.PE,
            strikePrice: peHedgeStrike.toString(),
          }),
        ]
      : []),
  ];

  const scripResults = await Promise.all(scripPromises);

  const validate = (scrip: scripMasterResponse[], label: string) => {
    if (!scrip || scrip.length === 0) {
      throw new Error(`${ALGO}: scrip not found for ${label}`);
    }
    return scrip[0];
  };

  const atmCe = validate(scripResults[0], `ATM CE ${atmStrike}`);
  const atmPe = validate(scripResults[1], `ATM PE ${atmStrike}`);
  const hedgeCe = isFirstTrade ? validate(scripResults[2], `Hedge CE ${ceHedgeStrike}`) : null;
  const hedgePe = isFirstTrade ? validate(scripResults[3], `Hedge PE ${peHedgeStrike}`) : null;

  const lotSize = Number.parseInt(atmCe.lotsize);
  if (!lotSize || lotSize <= 0) {
    throw new Error(`${ALGO}: invalid lotsize from scrip master: ${atmCe.lotsize}`);
  }

  console.log(`${ALGO}: lotSize = ${lotSize}`);

  const trades = [];

  // ── Step 5: Place hedge BUY orders (first trade only) ────────────
  if (isFirstTrade && hedgeCe && hedgePe) {
    await delay({ milliSeconds: DELAY });
    console.log(`${ALGO}: [1] BUY hedge CE — ${hedgeCe.symbol}, qty: ${buyLots * lotSize}`);
    const hedgeCeOrder = await doOrder({
      tradingsymbol: hedgeCe.symbol,
      symboltoken: hedgeCe.token,
      transactionType: TRANSACTION_TYPE_BUY,
      exchange: 'NFO',
      quantity: buyLots * lotSize,
      variety: 'NORMAL',
      ordertype: 'MARKET',
      productType: 'CARRYFORWARD',
    });
    console.log(`${ALGO}: [1] hedge CE status:`, hedgeCeOrder.status);
    trades.push({
      action: 'BUY',
      type: 'HEDGE_CE',
      symbol: hedgeCe.symbol,
      token: hedgeCe.token,
      strike: ceHedgeStrike,
      lots: buyLots,
      quantity: buyLots * lotSize,
      status: hedgeCeOrder.status,
    });

    await delay({ milliSeconds: DELAY });
    console.log(`${ALGO}: [2] BUY hedge PE — ${hedgePe.symbol}, qty: ${buyLots * lotSize}`);
    const hedgePeOrder = await doOrder({
      tradingsymbol: hedgePe.symbol,
      symboltoken: hedgePe.token,
      transactionType: TRANSACTION_TYPE_BUY,
      exchange: 'NFO',
      quantity: buyLots * lotSize,
      variety: 'NORMAL',
      ordertype: 'MARKET',
      productType: 'CARRYFORWARD',
    });
    console.log(`${ALGO}: [2] hedge PE status:`, hedgePeOrder.status);
    trades.push({
      action: 'BUY',
      type: 'HEDGE_PE',
      symbol: hedgePe.symbol,
      token: hedgePe.token,
      strike: peHedgeStrike,
      lots: buyLots,
      quantity: buyLots * lotSize,
      status: hedgePeOrder.status,
    });
  }

  // ── Step 6: Sell ATM CE ──────────────────────────────────────────
  await delay({ milliSeconds: DELAY });
  console.log(`${ALGO}: [${isFirstTrade ? 3 : 1}] SELL ATM CE — ${atmCe.symbol}, qty: ${sellLots * lotSize}`);
  const atmCeOrder = await doOrder({
    tradingsymbol: atmCe.symbol,
    symboltoken: atmCe.token,
    transactionType: TRANSACTION_TYPE_SELL,
    exchange: 'NFO',
    quantity: sellLots * lotSize,
    variety: 'NORMAL',
    ordertype: 'MARKET',
    productType: 'CARRYFORWARD',
  });
  console.log(`${ALGO}: ATM CE sell status:`, atmCeOrder.status);
  trades.push({
    action: 'SELL',
    type: 'ATM_CE',
    symbol: atmCe.symbol,
    token: atmCe.token,
    strike: atmStrike,
    lots: sellLots,
    quantity: sellLots * lotSize,
    status: atmCeOrder.status,
  });

  // ── Step 7: Sell ATM PE ──────────────────────────────────────────
  await delay({ milliSeconds: DELAY });
  console.log(`${ALGO}: [${isFirstTrade ? 4 : 2}] SELL ATM PE — ${atmPe.symbol}, qty: ${sellLots * lotSize}`);
  const atmPeOrder = await doOrder({
    tradingsymbol: atmPe.symbol,
    symboltoken: atmPe.token,
    transactionType: TRANSACTION_TYPE_SELL,
    exchange: 'NFO',
    quantity: sellLots * lotSize,
    variety: 'NORMAL',
    ordertype: 'MARKET',
    productType: 'CARRYFORWARD',
  });
  console.log(`${ALGO}: ATM PE sell status:`, atmPeOrder.status);
  trades.push({
    action: 'SELL',
    type: 'ATM_PE',
    symbol: atmPe.symbol,
    token: atmPe.token,
    strike: atmStrike,
    lots: sellLots,
    quantity: sellLots * lotSize,
    status: atmPeOrder.status,
  });

  // ── Step 8: Return summary ───────────────────────────────────────
  return {
    index,
    expiry,
    atmStrike,
    lotSize,
    blocked: false,
    isFirstTrade,
    sellPairCount: sellPairCount + 1,
    trades,
  };
};
