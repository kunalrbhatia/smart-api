import { Server, createServer } from 'http';
import cors from 'cors';
import get from 'lodash/get';
import express, {
  Request,
  Response,
  NextFunction,
  Application,
  ErrorRequestHandler,
} from 'express';
import bodyParser from 'body-parser';
import createHttpError from 'http-errors';
import cron from 'node-cron';
import {
  closeTrade,
  getLtpData,
  getPositions,
  getScrip,
  runAlgo,
} from './helpers/apiService';
import { createJsonFile, isFridayMondayTuesday } from './helpers/functions';
import { JsonFileStructure, Position, TradeDetails } from './app.interface';
import { MESSAGE_NOT_TAKE_TRADE } from './helpers/constants';

const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
const server: Server = createServer(app);
server.listen(process.env.PORT, () => {});
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', lastUpdated: '2023-07-27, 21:07:20' });
});
process.on('uncaughtException', function (err) {
  console.log(err);
});
cron.schedule('*/5 * * * *', async () => {
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    if (isFridayMondayTuesday()) {
      console.log('time ', istTz);
      const response = await runAlgo();
      console.log('response: ', response);
    } else {
      console.log(MESSAGE_NOT_TAKE_TRADE);
    }
  } catch (err) {
    console.log(err);
  }
});
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
app.post('/close-trade', async (req: Request, res: Response) => {
  await closeTrade();
});
app.post('/run-algo', async (req: Request, res: Response) => {
  if (isFridayMondayTuesday()) {
    const response = await runAlgo();
    res.json({
      mtm: response,
    });
  } else {
    res.json({
      mtm: MESSAGE_NOT_TAKE_TRADE,
    });
  }
});
app.post('/get-positions', async (req: Request, res: Response) => {
  // try {
  //   const currentPositions = await getPositions();
  //   const positions: Position[] = get(currentPositions, 'data', []) || [];
  //   const openPositions = positions.filter((position: Position) => {
  //     if (position.cfbuyqty !== position.cfsellqty) return position;
  //   });
  //   const trades: TradeDetails[] = createJsonFile().tradeDetails;
  //   // console.log(openPositions);
  //   // console.log(trades);
  //   // if (position.optiontype === 'CE') {
  //   //   tradeDetails.push({
  //   //     call: {
  //   //       strike: position.strikeprice,
  //   //       symbol: position.symbolname,
  //   //       token: position.symboltoken,
  //   //       closed: false,
  //   //     },
  //   //   });
  //   // } else {
  //   //   tradeDetails.push({
  //   //     put: {
  //   //       strike: position.strikeprice,
  //   //       symbol: position.symbolname,
  //   //       token: position.symboltoken,
  //   //       closed: false,
  //   //     },
  //   //   });
  //   // }
  //   res.json(trades);
  // } catch (err) {
  //   console.log(err);
  // }
});
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
