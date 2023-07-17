import { get } from 'lodash';
let { SmartAPI, WebSocket, WebSocketV2 } = require('smartapi-javascript');
const axios = require('axios');
const totp = require('totp-generator');
import {
  CLIENT_CODE,
  CLIENT_PASSWORD,
  API_KEY,
  ORDER_API,
  CLIENT_TOTP_KEY,
  CLIENT_PIN,
  GET_LTP_DATA_API,
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
export const generateSmartSession = async (): Promise<object> => {
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
