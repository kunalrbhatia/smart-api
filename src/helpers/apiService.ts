import { get as _get, isArray, isEmpty } from 'lodash';
import {
  CREDENTIALS,
  DELAY,
  delay,
  // generateSmartSession,
  getCredentials,
  getNearestStrike,
  getScripName,
  // getSmartSession,
  isCurrentTimeGreater,
  isTradingHoliday,
} from 'krb-smart-api-module';
import {
  areBothOptionTypesPresentForStrike,
  checkStrike,
  getAllOpenPositions,
  getAtmStrikePrice,
  getOpenPositionsByExpiry,
  getOpenSellPositions,
  getStrikeDifference,
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
import SmartSession from '../store/smartSession';
import moment from 'moment-timezone';
import { get, post } from './api';
import { getLocalIp, getMacAddress, getPublicIp } from './ip';
import { loginToSmartApi } from './smartApiLogin';
import { notify } from './notifier';
import { logger } from './logger';

/**
 * Gets the smart API session data.
 * @returns {Promise<ISmartApiData>}
 */
export const getSmartSession = async (): Promise<ISmartApiData> => {
  const session = SmartSession.getInstance().getPostData();
  if (session && session.jwtToken) {
    return session;
  }
  const creds = DataStore.getInstance().getPostData();
  const newSession = await loginToSmartApi(creds);
  SmartSession.getInstance().setPostData(newSession);
  return newSession;
};

/**
 * Generates the headers for SmartAPI requests.
 */
export const getAuthHeaders = async () => {
  const smartApiData = await getSmartSession();
  const cred = DataStore.getInstance().getPostData();
  const publicIp = await getPublicIp();
  const localIp = getLocalIp();
  const macAddress = getMacAddress();

  return {
    Authorization: `Bearer ${smartApiData.jwtToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': localIp,
    'X-ClientPublicIP': publicIp,
    'X-MACAddress': macAddress,
    'X-PrivateKey': cred.APIKEY,
  };
};

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
  logger.log(`${ALGO}: Nearest weekly expiry for ${scriptName}: ${nearest.raw}`);

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

      logger.warn(
        `${ALGO}: getLtpWithRetry — Invalid LTP for ${tradingsymbol} on attempt ${attempt + 1}/${maxRetries}: ${ltpData?.ltp}`,
      );
    } catch (error) {
      logger.error(`${ALGO}: getLtpWithRetry — Error on attempt ${attempt + 1}/${maxRetries}:`, error);

      // Rethrow immediately on last attempt
      if (attempt + 1 >= maxRetries) throw error;
    }

    // ── Exponential backoff: 1s → 2s → 4s → 8s → 16s ──
    const backoffMs = delayMs * Math.pow(2, attempt);
    logger.warn(
      `${ALGO}: getLtpWithRetry — Retrying ${tradingsymbol} in ${backoffMs}ms (Attempt ${attempt + 1}/${maxRetries})`,
    );
    await delay({ milliSeconds: backoffMs });

    attempt++;
  }

  throw new Error(`${ALGO}: getLtpWithRetry — No valid LTP for ${tradingsymbol} after ${maxRetries} attempts`);
};

/**
 * Fetches the Last Traded Price (LTP) for a given scrip.
 * @param {getLtpDataType} params - The parameters for fetching LTP data.
 * @returns {Promise<LtpDataType>} A promise that resolves with the LTP data.
 */
export const getLtpData = async ({ exchange, tradingsymbol, symboltoken }: getLtpDataType): Promise<LtpDataType> => {
  const data = { exchange, tradingsymbol, symboltoken };
  const headers = await getAuthHeaders();
  try {
    const response = await post(GET_LTP_DATA_API, data, headers);
    const responseData = _get(response, 'data', null);

    // Safety: handle both response shapes
    const ltp = _get(responseData, 'ltp', undefined);
    logger.log(`${ALGO}: LTP for ${tradingsymbol}: ${ltp}`);

    return responseData || {};
  } catch (error) {
    logger.error(`${ALGO}: GET_LTP_DATA_API failed for ${tradingsymbol}:`, error);
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
  const headers = await getAuthHeaders();
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
      logger.log(`${ALGO}: 📥 Downloading Scrip Master...`);
      const response = (await get(SCRIPMASTER, {})) as scripMasterResponse[];
      const acData: scripMasterResponse[] = response;
      logger.log(`${ALGO}: Scrip Master loaded. Total scrips: ${acData.length}`);
      ScripMasterStore.getInstance().setPostData({
        SCRIP_MASTER_JSON: acData,
      });
      return acData;
    } catch (error) {
      logger.error(`${ALGO}: fetchData failed:`, error);
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
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
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
    const errorMessage = `${ALGO}: getScrip failed for ${scriptName}`;
    logger.error(errorMessage);
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
    const errorMessage = `${ALGO}: getIndexScrip failed for ${scriptName}`;
    logger.error(errorMessage);
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
    logger.log(`${ALGO}: doOrder — isHedge: ${isHedge}, lots: ${lotsCalc}`);
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
  logger.log(`${ALGO}: Placing ${transactionType} order for ${tradingsymbol} (Qty: ${quantity})`);
  const headers = await getAuthHeaders();
  try {
    const response = await post(ORDER_API, data, headers);
    return response;
  } catch (error) {
    logger.error(`${ALGO}: doOrder failed for ${tradingsymbol}:`, error);
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
    await delay({ milliSeconds: DELAY });
    const formattedExpiry = moment(expiryDate, 'DDMMMYYYY').format('DDMMMYY').toUpperCase();
    const scripName = `${OrderStore.getInstance().getPostData().INDEX}${formattedExpiry}${strike.toString()}${optionType}`;
    const searchedScrip = await searchScrip(scripName);
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
    await delay({ milliSeconds: DELAY });
    const lotsize = _get(token, '0.lotsize', '0') || '0';
    // IF IS HEDGE WRITE LOGIC TO CHECK IF LTP IS LESS THAN 3 PREMIUM THEN ONLY GO AHEAD
    if (isHedge && ltpData.ltp > 3) {
      logger.log(`${ALGO}: Skipping hedge ${scripName} as LTP (${ltpData.ltp}) > 3`);
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
    logger.log(`${ALGO}: Order ${scripName} status: ${orderData.status}`);
    return {
      stikePrice: strike.toString(),
      expiryDate: expiryDate,
      token: _get(token, '0.token', ''),
      symbol: _get(token, '0.symbol', ''),
      exchange: _get(token, '0.exch_seg', ''),
      status: orderData.status,
    };
  } catch (error) {
    logger.error(`${ALGO}: doOrderByStrike failed for ${strike} ${optionType}:`, error);
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
    logger.log(`${ALGO}: Executing short straddle. ATM: ${atmStrike}, Hedge: ${isBuyHedge}, Strike Diff: ${strikeDiff}`);
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
    logger.error(`${ALGO}: shortStraddle failed:`, error);
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
      logger.log(`${ALGO}: Neither leg present for ATM ${atmStrike}. Selling both.`);
      await shortStraddle();
    } else if (cepe_present === CheckOptionType.ONLY_CE_PRESENT) {
      logger.log(`${ALGO}: Only CE present for ATM ${atmStrike}. Selling PE.`);
      const token = await getScrip({
        scriptName: OrderStore.getInstance().getPostData().INDEX,
        expiryDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
        optionType: OptionType.PE,
        strikePrice: atmStrike.toString(),
      });
      const ltpData = await getLtpData({
        exchange: _get(token, '0.exch_seg', ''),
        symboltoken: _get(token, '0.token', ''),
        tradingsymbol: _get(token, '0.symbol', ''),
      });
      if (ltpData.ltp > 5) {
        logger.log(`${ALGO}: PE LTP (${ltpData.ltp}) > 5. Executing sell.`);
        await doOrderByStrike(atmStrike, OptionType.PE, 'SELL');
      } else {
        logger.log(`${ALGO}: PE LTP (${ltpData.ltp}) <= 5. Skipping sell.`);
      }
    } else if (cepe_present === CheckOptionType.ONLY_PE_PRESENT) {
      logger.log(`${ALGO}: Only PE present for ATM ${atmStrike}. Selling CE.`);
      const token = await getScrip({
        scriptName: OrderStore.getInstance().getPostData().INDEX,
        expiryDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
        optionType: OptionType.CE,
        strikePrice: atmStrike.toString(),
      });
      const ltpData = await getLtpData({
        exchange: _get(token, '0.exch_seg', ''),
        symboltoken: _get(token, '0.token', ''),
        tradingsymbol: _get(token, '0.symbol', ''),
      });
      if (ltpData.ltp > 5) {
        logger.log(`${ALGO}: CE LTP (${ltpData.ltp}) > 5. Executing sell.`);
        await doOrderByStrike(atmStrike, OptionType.CE, 'SELL');
      } else {
        logger.log(`${ALGO}: CE LTP (${ltpData.ltp}) <= 5. Skipping sell.`);
      }
    } else {
      logger.log(`${ALGO}: Both legs present for ATM ${atmStrike}.`);
    }
  } catch (error) {
    logger.error(`${ALGO}: checkBothLegs failed:`, error);
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
    const positions = await getPositionsJson();
    const isSameStrikeAlreadyTraded = checkStrike(positions, atmStrike.toString());
    const result = areBothOptionTypesPresentForStrike(positions, atmStrike.toString());
    const cepe_present = checkBoth_CE_PE_Present(result);
    
    logger.log(`${ALGO}: Repeat check — Diff: ${Math.abs(difference)}, Threshold: ${strikeDiff}, Traded: ${isSameStrikeAlreadyTraded}`);

    if (Math.abs(difference) >= strikeDiff && isSameStrikeAlreadyTraded === false) {
      logger.log(`${ALGO}: Conditions met for new strike ${atmStrike}.`);
      await checkBothLegs({ cepe_present, atmStrike });
    } else if (difference === 0 && isSameStrikeAlreadyTraded) {
      logger.log(`${ALGO}: Re-checking existing strike ${atmStrike}.`);
      await checkBothLegs({ cepe_present, atmStrike });
    }
  } catch (error) {
    logger.error(`${ALGO}: repeatShortStraddle failed:`, error);
    throw error;
  }
};

export const getPositions = async (
  smartSession: ISmartApiData,
  cred: CREDENTIALS,
  maxRetries: number = 5,
  delayMs: number = 1000,
): Promise<Position[]> => {
  const headers = await getAuthHeaders();

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
          logger.log(`${ALGO}: getPositions — Success on attempt ${attempt + 1}. Total positions: ${positions.length}`);
          return positions;
        }

        logger.warn(
          `${ALGO}: getPositions — Invalid data shape on attempt ${attempt + 1}/${maxRetries}: ${JSON.stringify(positions)}`,
        );
      } else {
        logger.warn(`${ALGO}: getPositions — HTTP ${response.status} on attempt ${attempt + 1}/${maxRetries}`);
      }
    } catch (error) {
      logger.error(`${ALGO}: getPositions — Error on attempt ${attempt + 1}/${maxRetries}:`, error);
      if (attempt + 1 >= maxRetries) throw error;
    }

    // ── Exponential backoff: 1s → 2s → 4s → 8s → 16s ──
    const backoffMs = delayMs * Math.pow(2, attempt);
    logger.log(`${ALGO}: getPositions — Retrying in ${backoffMs}ms (Attempt ${attempt + 1}/${maxRetries})`);
    await delay({ milliSeconds: backoffMs });

    attempt++;
  }

  throw new Error(`${ALGO}: getPositions — Failed to get valid positions after ${maxRetries} attempts`);
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
    logger.log(`${ALGO}: Total open positions: ${openPositions.length}`);
    return openPositions;
  } catch (error) {
    logger.error(`${ALGO}: getPositionsJson failed:`, error);
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
  logger.log(`${ALGO}: fetchOpenPositionsByExpiry — Raw positions: ${allPositions?.length ?? 0}`);

  if (!Array.isArray(allPositions) || allPositions.length === 0) return [];

  const filtered = getOpenPositionsByExpiry(allPositions, index, expiryDate, type);
  logger.log(`${ALGO}: fetchOpenPositionsByExpiry — Filtered (${index} ${expiryDate} ${type}): ${filtered.length}`);

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
    logger.log(`${ALGO}: closeParticularTrade — ${tradingsymbol}: ${transactionStatus.status}`);
  } catch (error) {
    logger.error(`${ALGO}: closeParticularTrade failed:`, error);
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

          logger.log(`${ALGO}: Closing trade check for ${position.tradingsymbol} — LTP: ${ltpData.ltp}`);

          const isNetqtyNegative = Number.parseInt(position.netqty) < 0;
          const isLtpGreaterThanFive = ltpData && ltpData.ltp > 5;

          if (isNetqtyNegative && isLtpGreaterThanFive) {
            await closeParticularTrade({ trade: position });
          }
        }
      }
    }
  } catch (error) {
    logger.error(`${ALGO}: closeAllTrades failed:`, error);
    throw error;
  }
};
/**
 * Ensures all trades are closed and records the trade.
 * @param {boolean} [isAbrupt=false] - Whether to close trades abruptly.
 * @returns {Promise<void>}
 */
const closeTrade = async (isAbrupt = false) => {
  logger.log(`${ME}: Checking if all trades are closed.`);
  while ((await getPositionsJson(isAbrupt)).length > 0) {
    logger.log(`${ALGO}: Active trades found. Executing close...`);
    await closeAllTrades(isAbrupt);
  }
  logger.log(`${ALGO}: All trades confirmed closed.`);
  const mtm = await getMtm();
  await notify(`All trades closed. Final MTM: ${mtm}`);
  logger.log(`${ALGO}: Final MTM: ${mtm}`);
};
/**
 * Checks if the short straddle strategy should be repeated.
 * @param {number} atmStrike - The current ATM strike price.
 * @param {number} previousTradeStrikePrice - The previously traded strike price.
 * @returns {Promise<void>}
 */
const checkToRepeatShortStraddle = async (atmStrike: number, previousTradeStrikePrice: number) => {
  logger.log(`${ALGO}: ATM Strike: ${atmStrike}. Previous Strike: ${previousTradeStrikePrice}`);
  if (Number.isFinite(atmStrike)) {
    const difference = atmStrike - previousTradeStrikePrice;
    await delay({ milliSeconds: DELAY });
    await repeatShortStraddle(difference, atmStrike);
    logger.log(`${ALGO}: Strike Difference: ${difference}`);
  } else {
    logger.error(`${ALGO}: 'atmStrike' is infinity! Stopping operations.`);
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
    logger.log(`${ALGO}: Executing initial trade.`);
    await shortStraddle(true);
    await notify('Short Straddle order executed successfully!');
  } else {
    logger.log(`${ALGO}: Trade already active. Checking repeat conditions.`);
    await delay({ milliSeconds: DELAY });
    const atmStrike = await getAtmStrikePrice();
    const no_of_trades = data.length;
    const previousTradeStrikePrice: string | number = getNearestStrike({
      algoTrades: data,
      atmStrike: atmStrike,
      expirationDate: OrderStore.getInstance().getPostData().EXPIRYDATE,
    });
    logger.log(
      `${ALGO}: ATM: ${atmStrike}, Positions: ${no_of_trades}, Previous Strike: ${previousTradeStrikePrice}`,
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
 * @param {string} expiryDate - The nearest expiry date for NIFTY.
 * @returns {Promise<{isAllowed: boolean, reasons: string[]}>} A promise that resolves with a boolean and detailed reasons if not allowed.
 */
const isTradeAllowed = async (expiryDate: string) => {
  const isMarketOpen = !isMarketClosed();
  const isWeekend = moment().day() === 0 || moment().day() === 6;
  const isTuesday = moment().day() === 2;
  const isHoliday = isTradingHoliday();

  const todayStr = moment().format('DDMMMYYYY').toUpperCase();
  const isExpiryDay = todayStr === expiryDate;

  const hasTimePassedToTakeTrade = isCurrentTimeGreater({
    hours: 9,
    minutes: 15,
  });
  let isSmartAPIWorking = false;
  try {
    const smartData = await getSmartSession();
    await delay({ milliSeconds: DELAY });
    isSmartAPIWorking = !isEmpty(smartData);
  } catch (err) {
    console.log('Error occurred for getSmartSession in isTradeAllowed:', err);
  }
  console.log(
    `${ALGO}: checking conditions, isWeekend: ${isWeekend}, isTuesday: ${isTuesday}, isHoliday: ${isHoliday}, isMarketOpen: ${isMarketOpen}, hasTimePassed 09:15am: ${hasTimePassedToTakeTrade}, isSmartAPIWorking: ${isSmartAPIWorking}, isExpiryDay: ${isExpiryDay} (${expiryDate})`,
  );

  const reasons: string[] = [];
  if (!isExpiryDay) reasons.push(`Today is not NIFTY expiry day (Next expiry: ${expiryDate})`);
  if (!isTuesday) reasons.push('Today is not Tuesday');
  if (isWeekend) reasons.push('It is a weekend');
  if (!isMarketOpen) reasons.push('Market is closed');
  if (!hasTimePassedToTakeTrade) reasons.push('Time has not passed 09:15 AM');
  if (!isSmartAPIWorking) reasons.push('Smart API is not working');
  if (isHoliday) reasons.push('Today is a trading holiday');

  const isAllowed =
    isExpiryDay === true &&
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
    INDEX: 'NIFTY',
    LOSSPERLOT: lossPerLot,
    INDIAVIX: indiaVixLtp.ltp,
  });
  console.log(`${ALGO}: OrderStore data: `, OrderStore.getInstance().getPostData());
  try {
    const { isAllowed, reasons } = await isTradeAllowed(expiryDate);
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
    const { isAllowed, reasons } = await isTradeAllowed(expiryDate);
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
    const headers = await getAuthHeaders();
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
      if (stoplossStatus.status) {
        await notify(`Stop Loss order placed for ${tradingsymbol} at ${stoplossPrice.toFixed(2)}`);
      }
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
 * Pure execution — places orders based on what it's told. No position checking.
 * Caller is responsible for deciding isFirstTrade.
 */
export const executeSellAtmBuyHedge = async ({
  index,
  expiry,
  atmStrike,
  isFirstTrade,
  sellLots = 1,
  buyLots = 3,
  hedgeDistance = 500,
}: {
  index: string;
  expiry: string;
  atmStrike: number;
  isFirstTrade: boolean;
  sellLots?: number;
  buyLots?: number;
  hedgeDistance?: number;
}) => {
  const ceHedgeStrike = atmStrike + hedgeDistance;
  const peHedgeStrike = atmStrike - hedgeDistance;

  console.log(`${ALGO}: executeSellAtmBuyHedge — isFirstTrade: ${isFirstTrade}`);
  console.log(`${ALGO}:   SELL ${sellLots}L ATM CE+PE @ ${atmStrike}`);
  if (isFirstTrade) {
    console.log(`${ALGO}:   BUY  ${buyLots}L hedge CE @ ${ceHedgeStrike}`);
    console.log(`${ALGO}:   BUY  ${buyLots}L hedge PE @ ${peHedgeStrike}`);
  }

  // ── Fetch required scrips ────────────────────────────────────────
  const scripPromises = [
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
    if (!scrip || scrip.length === 0) throw new Error(`${ALGO}: scrip not found for ${label}`);
    return scrip[0];
  };

  const atmCe = validate(scripResults[0], `ATM CE ${atmStrike}`);
  const atmPe = validate(scripResults[1], `ATM PE ${atmStrike}`);
  const hedgeCe = isFirstTrade ? validate(scripResults[2], `Hedge CE ${ceHedgeStrike}`) : null;
  const hedgePe = isFirstTrade ? validate(scripResults[3], `Hedge PE ${peHedgeStrike}`) : null;

  const lotSize = Number.parseInt(atmCe.lotsize);
  if (!lotSize || lotSize <= 0) throw new Error(`${ALGO}: invalid lotsize: ${atmCe.lotsize}`);

  console.log(`${ALGO}: lotSize = ${lotSize}`);

  const trades = [];

  // ── BUY hedges (first trade only) ───────────────────────────────
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

  // ── SELL ATM CE ──────────────────────────────────────────────────
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

  // ── SELL ATM PE ──────────────────────────────────────────────────
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

  return { index, expiry, atmStrike, lotSize, isFirstTrade, trades };
};
/**
 * Places stoploss orders for all sell positions that don't already have one.
 * Stoploss trigger = sellavgprice * stoplossFactor (default 1.5 for 150%)
 *
 * @param index - e.g. 'NIFTY'
 * @param expiry - e.g. '17FEB2026'
 * @param stoplossFactor - multiplier for stoploss price (default 1.5 = 150%)
 */
export const placeStoplossForAllSells = async ({
  index,
  expiry,
  stoplossFactor = 1.5,
}: {
  index: string;
  expiry: string;
  stoplossFactor?: number;
}) => {
  console.log(`${ALGO}: placeStoplossForAllSells — index: ${index}, expiry: ${expiry}, factor: ${stoplossFactor}`);

  // ── Step 1: Get all SELL positions ───────────────────────────────
  console.log(`${ALGO}: Fetching sell positions for index: ${index}, expiry: ${expiry}`);
  const sellPositions = await fetchOpenPositionsByExpiry(index, expiry, 'SELL');

  if (sellPositions.length === 0) {
    console.log(`${ALGO}: No sell positions found, nothing to place stoploss for`);
    return { index, expiry, stoplossFactor, sellPositionCount: 0, stoplossOrders: [] };
  }

  console.log(`${ALGO}: Found ${sellPositions.length} sell positions`);
  console.log(
    `${ALGO}: Sell positions details:`,
    sellPositions.map(p => ({
      tradingsymbol: p.tradingsymbol,
      symboltoken: p.symboltoken,
      netqty: p.netqty,
      cfsellavgprice: p.cfsellavgprice,
    })),
  );

  // ── Step 2: Get existing pending stoploss orders ─────────────────
  console.log(`${ALGO}: Fetching existing pending stoploss orders`);
  const headers = await getAuthHeaders();

  let pendingOrders: Record<string, unknown>[] = [];
  try {
    console.log(`${ALGO}: Making request to GET_ORDER_BOOK_API`);
    const response = await get(GET_ORDER_BOOK_API, headers);
    console.log(`${ALGO}: Raw order book response:`, response);
    const orders = _get(response, 'data', []);
    console.log(`${ALGO}: Orders from response:`, orders);
    pendingOrders = Array.isArray(orders)
      ? orders.filter(
          (order: Record<string, unknown>) =>
            _get(order, 'status', '') === PENDING_ORDER_STATUS && _get(order, 'variety', '') === VARIETY_STOPLOSS,
        )
      : [];
    console.log(`${ALGO}: Found ${pendingOrders.length} existing pending stoploss orders`);
    console.log(
      `${ALGO}: Pending orders details:`,
      pendingOrders.map(o => ({
        tradingsymbol: _get(o, 'tradingsymbol', ''),
        symboltoken: _get(o, 'symboltoken', ''),
        status: _get(o, 'status', ''),
        variety: _get(o, 'variety', ''),
      })),
    );
  } catch (error) {
    console.warn(`${ALGO}: Failed to fetch pending orders, continuing without dedup:`, error);
  }

  // ── Step 3: Place stoploss for each sell position ────────────────
  const stoplossOrders = [];
  console.log(`${ALGO}: Processing ${sellPositions.length} sell positions for stoploss placement`);

  for (let i = 0; i < sellPositions.length; i++) {
    const position = sellPositions[i];
    console.log(`${ALGO}: Processing position ${i + 1}/${sellPositions.length}`, {
      tradingsymbol: position.tradingsymbol,
      symboltoken: position.symboltoken,
      netqty: position.netqty,
      cfsellavgprice: position.cfsellavgprice,
    });

    const tradingsymbol = position.tradingsymbol;
    const symboltoken = position.symboltoken;
    const netqty = Number.parseInt(position.netqty);
    const sellavgprice = Number.parseFloat(position.cfsellavgprice);

    // Validate
    if (!sellavgprice || sellavgprice <= 0) {
      console.warn(`${ALGO}: Invalid sellavgprice for ${tradingsymbol}: ${position.sellavgprice}, skipping`);
      stoplossOrders.push({
        tradingsymbol,
        symboltoken,
        status: 'skipped',
        reason: `Invalid sellavgprice: ${position.sellavgprice}`,
      });
      continue;
    }

    // Check if stoploss already exists for this position
    console.log(`${ALGO}: Checking if stoploss already exists for ${tradingsymbol}`);
    const hasExistingStoploss = pendingOrders.some(
      (order: Record<string, unknown>) =>
        _get(order, 'tradingsymbol', '') === tradingsymbol && _get(order, 'symboltoken', '') === symboltoken,
    );

    if (hasExistingStoploss) {
      console.log(`${ALGO}: Stoploss already exists for ${tradingsymbol}, skipping`);
      stoplossOrders.push({
        tradingsymbol,
        symboltoken,
        status: 'skipped',
        reason: 'Stoploss already exists',
      });
      continue;
    }

    // Calculate stoploss price — 150% MORE than entry, not 150% OF entry
    const stoplossPrice = sellavgprice + sellavgprice * stoplossFactor;
    const quantity = Math.abs(netqty);
    console.log(
      `${ALGO}: Calculated stoploss for ${tradingsymbol} — entry: ${sellavgprice}, stoploss: ${stoplossPrice.toFixed(2)}, qty: ${quantity}`,
    );

    try {
      console.log(`${ALGO}: Placing stoploss order for ${tradingsymbol}`);
      await delay({ milliSeconds: DELAY });

      const orderParams = {
        tradingsymbol,
        symboltoken,
        transactionType: TRANSACTION_TYPE_BUY, // Closing a sell = buy
        exchange: 'NFO',
        quantity,
        variety: VARIETY_STOPLOSS as 'STOPLOSS',
        ordertype: 'STOPLOSS_MARKET' as const,
        productType: 'CARRYFORWARD' as const,
        price: stoplossPrice,
        triggerprice: stoplossPrice,
      };

      console.log(`${ALGO}: Order parameters:`, orderParams);

      const orderResponse = await doOrder(orderParams);

      console.log(`${ALGO}: Stoploss order placed for ${tradingsymbol}:`, {
        status: orderResponse.status,
        orderId: orderResponse.data?.orderid,
        message: orderResponse.message,
      });

      stoplossOrders.push({
        tradingsymbol,
        symboltoken,
        entryPrice: sellavgprice,
        stoplossPrice: Number(stoplossPrice.toFixed(2)),
        quantity,
        status: orderResponse.status,
        orderId: orderResponse.data?.orderid,
        message: orderResponse.message,
      });
    } catch (error) {
      console.error(`${ALGO}: Failed to place stoploss for ${tradingsymbol}:`, error);
      stoplossOrders.push({
        tradingsymbol,
        symboltoken,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log(`${ALGO}: Completed processing all positions. Results:`, {
    totalPositions: sellPositions.length,
    processedOrders: stoplossOrders.length,
    successfulOrders: stoplossOrders.filter(o => o.status === 'success' || o.orderId).length,
    skippedOrders: stoplossOrders.filter(o => o.status === 'skipped').length,
    failedOrders: stoplossOrders.filter(o => o.status === 'failed').length,
  });

  return {
    index,
    expiry,
    stoplossFactor,
    sellPositionCount: sellPositions.length,
    stoplossOrders,
  };
};
/**
 * Fetches historical candle data (OHLC) from SmartAPI.
 * API Doc: https://smartapi.angelbroking.com/docs/Historical
 * @param exchange - e.g. 'NSE', 'NFO'
 * @param symboltoken - token from scrip master
 * @param interval - 'ONE_MINUTE' | 'FIVE_MINUTE' | 'FIFTEEN_MINUTE' | 'ONE_HOUR' | 'ONE_DAY'
 * @param fromdate - 'YYYY-MM-DD HH:mm'
 * @param todate - 'YYYY-MM-DD HH:mm'
 */
export const getCandleData = async ({
  exchange,
  symboltoken,
  interval,
  fromdate,
  todate,
}: {
  exchange: string;
  symboltoken: string;
  interval:
    | 'ONE_MINUTE'
    | 'THREE_MINUTE'
    | 'FIVE_MINUTE'
    | 'TEN_MINUTE'
    | 'FIFTEEN_MINUTE'
    | 'THIRTY_MINUTE'
    | 'ONE_HOUR'
    | 'ONE_DAY';
  fromdate: string;
  todate: string;
}): Promise<number[][]> => {
  const headers = await getAuthHeaders();

  const data = {
    exchange,
    symboltoken,
    interval,
    fromdate,
    todate,
  };

  console.log(`${ALGO}: getCandleData request:`, JSON.stringify(data, null, 2));

  try {
    // Correct API endpoint from docs
    const response = await post(
      'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData',
      data,
      headers,
    );

    console.log(`${ALGO}: getCandleData raw response:`, JSON.stringify(response, null, 2));

    const candles = _get(response, 'data', []);

    if (!Array.isArray(candles)) {
      console.error(`${ALGO}: Invalid candle data format:`, response);
      throw new Error('Invalid candle data format from API');
    }

    console.log(`${ALGO}: getCandleData — fetched ${candles.length} candles for token ${symboltoken}`);
    console.log(`${ALGO}: First candle:`, candles[0]);
    console.log(`${ALGO}: Last candle:`, candles.at(-1));

    return candles;
  } catch (error) {
    console.error(`${ALGO}: getCandleData failed:`, error);
    throw error;
  }
};
