import { CLIENT_CODE, API_KEY, ORDER_API, CLIENT_PIN } from './constants';
import { ISmartApiData } from './app.interface';
import { Server, createServer } from 'http';
import cors from 'cors';
import { get } from 'lodash';
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
import {
  generateSmartSession,
  getLtpData,
  getScrip,
} from './helpers/apiService';
import {
  delay,
  getAtmStrikePrice,
  getNextExpiry,
  isPastTime,
} from './helpers/functions';
let { SmartAPI, WebSocket, WebSocketV2 } = require('smartapi-javascript');
const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
const server: Server = createServer(app);
let stremMsg: object = { message: 'no_message', status: 'in progress' };
const doOrder = () => {
  // smart_api
  //   .generateSession(CLIENT_CODE, CLIENT_PIN)
  //   .then((data: object) => {
  //     let smartApiData: ISmartApiData = _.get(data, 'data', {});
  //     const payloadData: string = JSON.stringify({
  //       exchange: 'NSE',
  //       tradingsymbol: 'BANKNIFTY29SEP22FUT',
  //       symboltoken: '37516',
  //       quantity: 1,
  //       transactiontype: 'BUY',
  //       ordertype: 'MARKET',
  //       variety: 'NORMAL',
  //       producttype: 'CNC',
  //     });
  //     const config: object = {
  //       method: 'post',
  //       url: ORDER_API,
  //       headers: {
  //         Authorization: 'Bearer ' + smartApiData.jwtToken,
  //         'Content-Type': 'application/json',
  //         Accept: 'application/json',
  //         'X-UserType': 'USER',
  //         'X-SourceID': 'WEB',
  //         'X-ClientLocalIP': '192.168.168.168',
  //         'X-ClientPublicIP': '106.193.147.98',
  //         'X-MACAddress': 'fe80::216e:6507:4b90:3719',
  //         'X-PrivateKey': API_KEY,
  //       },
  //       data: payloadData,
  //     };
  //     axios(config)
  //       .then((response: object) => {
  //         console.log(JSON.stringify(_.get(response, 'data')));
  //       })
  //       .catch(function (error: any) {
  //         console.log(error);
  //       });
  //   });
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
    const ltpData = await getLtpData({
      exchange,
      symboltoken,
      tradingsymbol,
    });
    res.send(ltpData);
  }
);
app.post('/scrip/details/get-script', async (req: Request, res: Response) => {
  const scriptName: string = req.body.scriptName;
  const strikePrice: string = req.body.strikePrice;
  const optionType: 'CE' | 'PE' = req.body.optionType || '';
  const expiryDate: string = req.body.expiryDate;
  res.send(await getScrip({ scriptName, strikePrice, optionType, expiryDate }));
});
app.post('/run-algo', async (req: Request, res: Response) => {
  //CHECK IF IT IS PAST 10:15
  while (!isPastTime()) {
    await delay({ milliSeconds: 1000 });
  }
  //GET ATM STIKE PRICE
  const atmStrike = await getAtmStrikePrice();
  await delay({ milliSeconds: 2000 });
  //GET CURRENT EXPIRY
  const expiryDate = getNextExpiry();
  //GET CALL DATA
  const ceToken = await getScrip({
    scriptName: 'BANKNIFTY',
    expiryDate: expiryDate,
    optionType: 'CE',
    strikePrice: atmStrike.toString(),
  });
  await delay({ milliSeconds: 2000 });
  //GET PUT DATA
  const peToken = await getScrip({
    scriptName: 'BANKNIFTY',
    expiryDate: expiryDate,
    optionType: 'PE',
    strikePrice: atmStrike.toString(),
  });
  await delay({ milliSeconds: 2000 });
  //GET CALL LTP
  const ltpCE = await getLtpData({
    exchange: get(ceToken, '0.exch_seg'),
    tradingsymbol: get(ceToken, '0.symbol'),
    symboltoken: get(ceToken, '0.token'),
  });
  await delay({ milliSeconds: 2000 });
  //GET PUT LTP
  const ltpPE = await getLtpData({
    exchange: get(peToken, '0.exch_seg'),
    tradingsymbol: get(peToken, '0.symbol'),
    symboltoken: get(peToken, '0.token'),
  });
  await delay({ milliSeconds: 2000 });
  res.json({
    message: 'Success: ',
    atmStike: atmStrike,
    ceToken: ceToken,
    ltpCe: ltpCE,
    peToken: peToken,
    ltpPE: ltpPE,
  });
});
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
