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
} from '../constants';
type getLtpDataType = {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
  jwtToken: string;
};
export const getLtpData = async (payload: getLtpDataType): Promise<object> => {
  const data = JSON.stringify(payload);
  const config = {
    method: 'post',
    url: GET_LTP_DATA_API,
    headers: {
      Authorization: `Bearer ${payload.jwtToken}`,
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
export const generateSmartSession = async (): Promise<object[]> => {
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
  strikePrice: string;
  optionType: string;
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
      return (_scripName.indexOf(scriptName) > 0 ||
        _scripName === scriptName) &&
        get(scrip, 'exch_seg', '') === 'NFO' &&
        get(scrip, 'instrumenttype', '') === 'OPTIDX' &&
        _symbol.indexOf(strikePrice) > 0 &&
        _symbol.indexOf(optionType) !== -1 &&
        _expiry === expiryDate
        ? scrip
        : null;
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
