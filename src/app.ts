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
  checkMarketConditionsAndExecuteTrade,
  checkPositionAlreadyExists,
  closeTrade,
  getLtpData,
  getPositions,
  getScrip,
} from './helpers/apiService';
import { createJsonFile, getOpenPositions } from './helpers/functions';
import { Position } from './app.interface';

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
    console.log('time ', istTz);
    const response = await checkMarketConditionsAndExecuteTrade();
    console.log('response: ', response);
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
  const response = await checkMarketConditionsAndExecuteTrade();
  res.json({
    mtm: response,
  });
});
app.post('/get-positions', async (req: Request, res: Response) => {
  try {
    const currentPositions = await getPositions();
    const positions: Position[] = get(currentPositions, 'data', []) || [];
    const openPositions = getOpenPositions(positions);
    const tradeDetails = createJsonFile().tradeDetails;
    for (const position of openPositions) {
      const isTradeExists = await checkPositionAlreadyExists({ position });
      if (isTradeExists === null) {
        if (position.optiontype === 'CE') {
          tradeDetails.push({
            call: {
              strike: position.strikeprice,
              symbol: position.symbolname,
              token: position.symboltoken,
              closed: false,
              isAlgoCreatedPosition: false,
            },
          });
        } else {
          tradeDetails.push({
            put: {
              strike: position.strikeprice,
              symbol: position.symbolname,
              token: position.symboltoken,
              closed: false,
              isAlgoCreatedPosition: false,
            },
          });
        }
      }
    }
    res.json(tradeDetails);
  } catch (err) {
    console.log(err);
  }
});
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
