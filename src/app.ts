import {
  CLIENT_CODE,
  CLIENT_PASSWORD,
  API_KEY,
  STREAM_URL,
  ORDER_API,
} from './constants';
import { ISmartApiData } from './app.interface';
import { Server, createServer } from 'http';
import cors from 'cors';
import * as _ from 'lodash';
import express, {
  Request,
  Response,
  NextFunction,
  Application,
  ErrorRequestHandler,
} from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import createHttpError from 'http-errors';
const { SmartAPI, WebSocket } = require('smartapi-javascript');
const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
const server: Server = createServer(app);
let scripMaster: object[];
let stremMsg: object = { message: 'no_message', status: 'in progress' };
/* -------WEB SOCKET CODE */
let bnIndexLTP: string = '';
let bnCurrentFutureLTP: string = '';
let bnNextFutureLTP: string = '';
const smart_api = new SmartAPI({
  api_key: API_KEY,
});

const doOrder = () => {
  const data: string = JSON.stringify({
    exchange: 'NSE',
    tradingsymbol: 'INFY-EQ',
    quantity: 5,
    disclosedquantity: 3,
    transactiontype: 'BUY',
    ordertype: 'MARKET',
    variety: 'NORMAL',
    producttype: 'INTRADAY',
  });
  const config: object = {
    method: 'post',
    url: ORDER_API,
    headers: {
      Authorization: 'Bearer AUTHORIZATION_TOKEN',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': 'CLIENT_LOCAL_IP',
      'X-ClientPublicIP': 'CLIENT_PUBLIC_IP',
      'X-MACAddress': 'MAC_ADDRESS',
      'X-PrivateKey': 'API_KEY',
    },
  };
  axios(config)
    .then((response: object) => {
      console.log(JSON.stringify(_.get(response, 'data')));
    })
    .catch(function (error: any) {
      console.log(error);
    });
};
const fetchData = async () => {
  try {
    await axios
      .get(
        'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json'
      )
      .then((response: object) => {
        let acData: object[] = _.get(response, 'data', []) || [];
        scripMaster = acData.map((element, index) => {
          return {
            ...element,
            label: _.get(element, 'name', 'NONAME') || 'NONAME',
            key: '0' + index + _.get(element, 'token', '00') || '00',
          };
        });
      })
      .catch((evt: object) => {
        console.log(evt);
      });
  } catch (error) {
    console.error(_.get(error, 'message', '') || '');
  }
};
server.listen(5000, () => {});
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/scrip/details/get-script', (req: Request, res: Response) => {
  const scriptName: string = req.body.scriptName;
  if (scriptName && _.isArray(scripMaster) && scripMaster.length > 0) {
    let scrips = scripMaster.filter((scrip) => {
      const _scripName: string = _.get(scrip, 'name', '') || '';
      return (_scripName.indexOf(scriptName) > 0 ||
        _scripName === scriptName) &&
        _.get(scrip, 'exch_seg', '') === 'NFO' &&
        _.get(scrip, 'instrumenttype', '') === 'FUTIDX'
        ? scrip
        : null;
    });
    scrips = scrips.map((element: object, index: number) => {
      return {
        ...element,
        label: _.get(element, 'name', 'NoName') || 'NoName',
        key: index,
      };
    });
    res.json(scrips);
  } else {
    res.status(200).json({ message: 'pending' });
  }
});
app.get('/arbitrage', (req: Request, res: Response) => {
  const bnIndexInstrumentToken = '26009';
  const bankNiftyIndex = 'nse_cm|' + bnIndexInstrumentToken;
  const bnCurrentFutInstrumentToken = '82221';
  const bankNifty25Aug22FUT = 'nse_fo|' + bnCurrentFutInstrumentToken;
  const bnNextFutInstrumentToken = '37516';
  const bankNifty29SEP22FUT = 'nse_fo|' + bnNextFutInstrumentToken;
  const strWatchListScript =
    bankNiftyIndex + '&' + bankNifty25Aug22FUT + '&' + bankNifty29SEP22FUT;
  smart_api
    .generateSession(CLIENT_CODE, CLIENT_PASSWORD)
    .then((data: object) => {
      let smartApiData: ISmartApiData = _.get(data, 'data', {});
      const web_socket = new WebSocket({
        client_code: CLIENT_CODE,
        feed_token: smartApiData.feedToken,
        url: STREAM_URL,
      });
      web_socket
        .connect()
        .then(() => {
          web_socket.runScript(strWatchListScript, 'mw');
          /* setTimeout(function () {
            web_socket.close();
          }, 3000); */
        })
        .catch((err: any) => {
          throw err;
        });
      web_socket.on('tick', (wsStreamData: object[]) => {
        for (const obj of wsStreamData) {
          if (_.get(obj, 'tk') == bnIndexInstrumentToken && _.get(obj, 'ltp')) {
            bnIndexLTP = _.get(obj, 'ltp', '') || '';
          }
          if (
            _.get(obj, 'tk') == bnCurrentFutInstrumentToken &&
            _.get(obj, 'ltp')
          ) {
            bnCurrentFutureLTP = _.get(obj, 'ltp', '') || '';
          }
          if (
            _.get(obj, 'tk') == bnNextFutInstrumentToken &&
            _.get(obj, 'ltp')
          ) {
            bnNextFutureLTP = _.get(obj, 'ltp', '') || '';
          }
          let bnIndex = !isNaN(parseFloat(bnIndexLTP))
            ? parseFloat(bnIndexLTP)
            : 0;
          let bnCurrent = !isNaN(parseFloat(bnCurrentFutureLTP))
            ? parseFloat(bnCurrentFutureLTP)
            : 0;
          let bnNext = !isNaN(parseFloat(bnNextFutureLTP))
            ? parseFloat(bnNextFutureLTP)
            : 0;
          // bnIndex = 38000;
          // bnCurrent = 38100;
          // bnNext = 38200;
          let currentToSpot = bnCurrent - bnIndex;
          let nextToCurrent = bnNext - bnCurrent;
          let isGoodOpportunity: boolean =
            currentToSpot >= 80 && nextToCurrent <= 120 ? true : false;
          if (bnIndex > 0 && bnCurrent > 0 && bnNext > 0) {
            stremMsg = {
              currentToSpot: Math.ceil(currentToSpot),
              nextToCurrent: Math.ceil(nextToCurrent),
              isGoodOpportunity: isGoodOpportunity,
              status: 'ok',
            };
            if (isGoodOpportunity) {
              doOrder();
            }
            console.log('stremMsg: ', stremMsg);
          }
        }
      });
    })
    .catch((err: object) => {
      throw err;
    });
  res.json(stremMsg);
});
fetchData();
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
