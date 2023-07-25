import { get, isArray } from 'lodash';
let { SmartAPI, WebSocket, WebSocketV2 } = require('smartapi-javascript');
const axios = require('axios');
const totp = require('totp-generator');
import {
  CLIENT_CODE,
  API_KEY,
  CLIENT_TOTP_KEY,
  CLIENT_PIN,
  GET_LTP_DATA_API,
  SCRIPMASTER,
  GET_POSITIONS,
  DELAY,
  ORDER_API,
  GET_MARGIN,
  SHORT_DELAY,
} from '../constants';
import {
  checkStrike,
  delay,
  getAtmStrikePrice,
  getNextExpiry,
  writeJsonFile,
} from './functions';
import { Response } from 'express';
import { ISmartApiData, JsonFileStructure } from '../app.interface';
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
      'X-PrivateKey': API_KEY,
    },
    data: data,
  };
  return axios(config).then((response: object) => {
    return get(response, 'data.data', {}) || {};
  });
};
export const generateSmartSession = async (): Promise<ISmartApiData> => {
  const smart_api = new SmartAPI({
    api_key: API_KEY,
  });
  const TOTP = totp(CLIENT_TOTP_KEY);
  return smart_api
    .generateSession(CLIENT_CODE, CLIENT_PIN, TOTP)
    .then(async (response: object) => {
      return get(response, 'data');
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
      'X-PrivateKey': API_KEY,
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
  transactionType: 'BUY' | 'SELL';
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
      'X-PrivateKey': API_KEY,
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
        trade.call.token === get(value, 'symboltoken', '') ||
        trade.put.token === get(value, 'symboltoken', '')
      ) {
        mtm += parseInt(get(value, 'unrealised', ''));
      }
    });
  });
  return mtm;
};
export const shortStraddle = async () => {
  //GET ATM STIKE PRICE
  const atmStrike = await getAtmStrikePrice();
  await delay({ milliSeconds: DELAY });
  //GET CURRENT EXPIRY
  const expiryDate = getNextExpiry();
  //GET CALL DATA
  const ceToken = await getScrip({
    scriptName: 'BANKNIFTY',
    expiryDate: expiryDate,
    optionType: 'CE',
    strikePrice: atmStrike.toString(),
  });
  await delay({ milliSeconds: DELAY });
  //GET PUT DATA
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
    transactionType: 'SELL',
  });
  await delay({ milliSeconds: DELAY });
  const peOrderData = await doOrder({
    tradingsymbol: get(peToken, '0.symbol', ''),
    symboltoken: get(peToken, '0.token', ''),
    transactionType: 'SELL',
  });
  await delay({ milliSeconds: DELAY });
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
export const getNewWebSocket = async () => {
  const smartApiData: ISmartApiData = await generateSmartSession();
  return new WebSocketV2({
    jwttoken: smartApiData.jwtToken,
    apikey: API_KEY,
    clientcode: CLIENT_CODE,
    feedtype: smartApiData.feedToken,
  });
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
      'X-PrivateKey': API_KEY,
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
  data: JsonFileStructure,
  atmStrike: number
) => {
  if (
    difference > 300 &&
    checkStrike(get(data, 'tradeDetails', []), atmStrike.toString()) === false
  ) {
    const shortStraddleData = await shortStraddle();
    data.tradeDetails.push({
      mtmTotal: 0,
      call: {
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.ceOrderToken,
        symbol: shortStraddleData.ceOrderSymbol,
        mtm: 0,
      },
      put: {
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.peOrderToken,
        symbol: shortStraddleData.peOrderSymbol,
        mtm: 0,
      },
    });
  }
  return data;
};
export const closeTrade = (data: JsonFileStructure) => {
  const tradeDetails = data.tradeDetails;
  tradeDetails.forEach(async (trade) => {
    if (trade.call.token !== '' || trade.put.token !== '') {
      await delay({ milliSeconds: SHORT_DELAY });
      await doOrder({
        tradingsymbol: trade.call.symbol,
        transactionType: 'BUY',
        symboltoken: trade.call.token,
      });
      await delay({ milliSeconds: SHORT_DELAY });
      await doOrder({
        tradingsymbol: trade.put.symbol,
        transactionType: 'BUY',
        symboltoken: trade.put.token,
      });
    }
  });
};
export const checkToRepeatShortStraddle = async (
  atmStrike: number,
  previousTradeStrikePrice: number,
  data: JsonFileStructure
) => {
  let reformedData;
  if (atmStrike > previousTradeStrikePrice) {
    const difference = atmStrike - previousTradeStrikePrice;
    reformedData = await repeatShortStraddle(difference, data, atmStrike);
    writeJsonFile(reformedData);
  } else if (atmStrike < previousTradeStrikePrice) {
    const difference = previousTradeStrikePrice - atmStrike;
    reformedData = await repeatShortStraddle(difference, data, atmStrike);
    writeJsonFile(reformedData);
  }
};
