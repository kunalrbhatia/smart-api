import { CLIENT_CODE, CLIENT_PASSWORD, API_KEY, ORDER_API } from './constants';
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
import { generateSmartSession, getLtpData } from './helpers/apiService';
let { SmartAPI, WebSocket, WebSocketV2 } = require('smartapi-javascript');
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
  smart_api
    .generateSession(CLIENT_CODE, CLIENT_PASSWORD)
    .then((data: object) => {
      let smartApiData: ISmartApiData = _.get(data, 'data', {});
      const payloadData: string = JSON.stringify({
        exchange: 'NSE',
        tradingsymbol: 'BANKNIFTY29SEP22FUT',
        symboltoken: '37516',
        quantity: 1,
        transactiontype: 'BUY',
        ordertype: 'MARKET',
        variety: 'NORMAL',
        producttype: 'CNC',
      });
      const config: object = {
        method: 'post',
        url: ORDER_API,
        headers: {
          Authorization: 'Bearer ' + smartApiData.jwtToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.168.168',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': API_KEY,
        },
        data: payloadData,
      };
      axios(config)
        .then((response: object) => {
          console.log(JSON.stringify(_.get(response, 'data')));
        })
        .catch(function (error: any) {
          console.log(error);
        });
    });
};
const fetchData = async (req: Request, res: Response, next: NextFunction) => {
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
        next();
      })
      .catch((evt: object) => {
        res.json({ error: evt });
      });
  } catch (error) {
    console.error(_.get(error, 'message', '') || '');
  }
};

server.listen(5000, () => {});
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
//doOrder();

app.post(
  '/script/details/get-script-ltp',
  async (req: Request, res: Response) => {
    const tradingsymbol: string = req.body.tradingsymbol;
    const exchange: string = req.body.exchange;
    const symboltoken: string = req.body.symboltoken;
    const smartApiData: object = await generateSmartSession();
    const jwtToken = _.get(smartApiData, 'jwtToken');
    const ltpData = await getLtpData({
      exchange,
      symboltoken,
      tradingsymbol,
      jwtToken,
    });
    res.send(ltpData);
  }
);
app.post(
  '/scrip/details/get-script',
  fetchData,
  (req: Request, res: Response) => {
    const scriptName: string = req.body.scriptName;
    const strikePrice: string = req.body.strikePrice;
    const optionType: 'CE' | 'PE' = req.body.optionType || '';
    const expiryDate: string = req.body.expiryDate;
    if (scriptName && _.isArray(scripMaster) && scripMaster.length > 0) {
      let scrips = scripMaster.filter((scrip) => {
        const _scripName: string = _.get(scrip, 'name', '') || '';
        const _symbol: string = _.get(scrip, 'symbol', '') || '';
        const _expiry: string = _.get(scrip, 'expiry', '') || '';
        return (_scripName.indexOf(scriptName) > 0 ||
          _scripName === scriptName) &&
          _.get(scrip, 'exch_seg', '') === 'NFO' &&
          _.get(scrip, 'instrumenttype', '') === 'OPTIDX' &&
          _symbol.indexOf(strikePrice) > 0 &&
          _symbol.indexOf(optionType) !== -1 &&
          _expiry === expiryDate
          ? scrip
          : null;
      });
      scrips.sort(
        (curr: object, next: object) =>
          _.get(curr, 'token', 0) - _.get(next, 'token', 0)
      );
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
  }
);
/* app.get('/arbitrage', (req: Request, res: Response) => {
  const bnIndexInstrumentToken = '26009';
  const bankNiftyIndex = 'nse_cm|' + bnIndexInstrumentToken;
  const bnCurrentFutInstrumentToken = '37516';
  const bankNifty29SEP22FUT = 'nse_fo|' + bnCurrentFutInstrumentToken;
  const bnNextFutInstrumentToken = '51942';
  const bankNifty27OCT22FUT = 'nse_fo|' + bnNextFutInstrumentToken;
  const strWatchListScript =
    bankNiftyIndex + '&' + bankNifty29SEP22FUT + '&' + bankNifty27OCT22FUT;

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
          // setTimeout(function () {
          //   web_socket.close();
          // }, 3000);
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
}); */
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
