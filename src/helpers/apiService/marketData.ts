import { get as _get, isArray } from 'lodash';
import moment from 'moment-timezone';
import { delay } from 'krb-smart-api-module';
import { get, post } from '../api';
import { logger } from '../logger';
import {
  ALGO,
  GET_LTP_DATA_API,
  SCRIPMASTER,
  SEARCHSCRIPAPI,
} from '../constants';
import {
  getLtpDataType,
  LtpDataType,
  scripMasterResponse,
  getScripType,
} from '../../app.interface';
import ScripMasterStore from '../../store/scripMasterStore';
import { getAuthHeaders } from './session';

/**
 * Fetches the scrip master data.
 * It first checks if the data is available in the store, if not, it fetches from the API.
 * @returns {Promise<scripMasterResponse[]>} A promise that resolves with the scrip master data.
 */
export const fetchData = async (): Promise<scripMasterResponse[]> => {
  const store = ScripMasterStore.getInstance();
  const data = store.getPostData().SCRIP_MASTER_JSON;

  if (data.length > 0 && !store.isExpired()) {
    return data as scripMasterResponse[];
  } else {
    try {
      logger.log(`${ALGO}: 📥 Downloading Scrip Master...`);
      const response = (await get(SCRIPMASTER, {})) as scripMasterResponse[];
      const acData: scripMasterResponse[] = response;
      logger.log(
        `${ALGO}: Scrip Master loaded. Total scrips: ${acData.length}`,
      );
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
 * Gets the nearest weekly expiry date for a given index (NIFTY or BANKNIFTY).
 * Returns the date in the scrip master format e.g. "20FEB2025"
 */
export const getNearestWeeklyExpiry = async (
  scriptName: 'NIFTY' | 'BANKNIFTY' = 'NIFTY',
): Promise<string> => {
  const scripMaster: scripMasterResponse[] = await fetchData();

  const today = moment().startOf('day');

  // Filter only OPTIDX options for the given index on NFO
  const options = scripMaster.filter(scrip => {
    const name: string = scrip.name || '';
    return (
      name === scriptName &&
      scrip.exch_seg === 'NFO' &&
      scrip.instrumenttype === 'OPTIDX' &&
      scrip.expiry // must have expiry
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
  logger.log(
    `${ALGO}: Nearest weekly expiry for ${scriptName}: ${nearest.raw}`,
  );

  return nearest.raw; // returns e.g. "20FEB2025"
};

/**
 * Fetches the Last Traded Price (LTP) for a given scrip.
 */
export const getLtpData = async ({
  exchange,
  tradingsymbol,
  symboltoken,
}: getLtpDataType): Promise<LtpDataType> => {
  const data = { exchange, tradingsymbol, symboltoken };
  const headers = await getAuthHeaders();
  try {
    const response = await post(GET_LTP_DATA_API, data, headers);

    if (response?.status === false) {
      logger.error(
        `${ALGO}: GET_LTP_DATA_API returned status false for ${tradingsymbol}:`,
        response.message,
      );
      throw new Error(response.message || 'API returned status false');
    }

    const responseData = _get(response, 'data', null);

    // Safety: handle both response shapes
    const ltp = _get(responseData, 'ltp', undefined);
    logger.log(`${ALGO}: LTP for ${tradingsymbol}: ${ltp}`);

    return responseData || {};
  } catch (error) {
    logger.error(
      `${ALGO}: GET_LTP_DATA_API failed for ${tradingsymbol}:`,
      error,
    );
    throw error;
  }
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
      const ltpData: LtpDataType = await getLtpData({
        exchange,
        symboltoken,
        tradingsymbol,
      });

      if (
        ltpData?.ltp !== undefined &&
        ltpData?.ltp !== null &&
        ltpData.ltp > 0
      ) {
        return ltpData;
      }

      logger.warn(
        `${ALGO}: getLtpWithRetry — Invalid LTP for ${tradingsymbol} on attempt ${attempt + 1}/${maxRetries}: ${ltpData?.ltp}`,
      );
    } catch (error) {
      logger.error(
        `${ALGO}: getLtpWithRetry — Error on attempt ${attempt + 1}/${maxRetries}:`,
        error,
      );

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

  throw new Error(
    `${ALGO}: getLtpWithRetry — No valid LTP for ${tradingsymbol} after ${maxRetries} attempts`,
  );
};

/**
 * Searches for a scrip by its name.
 */
export const searchScrip = async (
  scripName: string,
  exchange: string = 'NFO',
) => {
  const headers = await getAuthHeaders();
  const data = { exchange, searchscrip: scripName };
  const response = await post(SEARCHSCRIPAPI, data, headers);
  return _get(response, 'data', '');
};

/**
 * Retrieves a scrip from the scrip master data based on the provided criteria.
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
    scrips.sort(
      (curr: object, next: object) =>
        _get(curr, 'token', 0) - _get(next, 'token', 0),
    );
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
 */
export const getIndexScrip = async ({
  scriptName,
}: {
  scriptName: string;
}): Promise<scripMasterResponse[]> => {
  const scripMaster: scripMasterResponse[] = await fetchData();
  if (scriptName && isArray(scripMaster) && scripMaster.length > 0) {
    const scrips = scripMaster.filter(scrip => {
      const _scripName: string = _get(scrip, 'name', '') || '';
      return (
        _scripName === scriptName && _get(scrip, 'instrumenttype') === 'AMXIDX'
      );
    });
    return scrips;
  } else {
    const errorMessage = `${ALGO}: getIndexScrip failed for ${scriptName}`;
    logger.error(errorMessage);
    throw errorMessage;
  }
};

/**
 * Fetches historical candle data (OHLC) from SmartAPI.
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

  logger.log(`${ALGO}: getCandleData request:`, JSON.stringify(data, null, 2));

  try {
    const response = await post(
      'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData',
      data,
      headers,
    );

    logger.log(
      `${ALGO}: getCandleData raw response:`,
      JSON.stringify(response, null, 2),
    );

    const candles = _get(response, 'data', []);

    if (!Array.isArray(candles)) {
      logger.error(`${ALGO}: Invalid candle data format:`, response);
      throw new Error('Invalid candle data format from API');
    }

    logger.log(
      `${ALGO}: getCandleData — fetched ${candles.length} candles for token ${symboltoken}`,
    );
    return candles;
  } catch (error) {
    logger.error(`${ALGO}: getCandleData failed:`, error);
    throw error;
  }
};
