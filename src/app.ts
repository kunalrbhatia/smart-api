import { Server, createServer } from 'http';
import cors from 'cors';
import express, {
  Request,
  Response,
  NextFunction,
  Application,
  ErrorRequestHandler,
} from 'express';
import bodyParser from 'body-parser';
import createHttpError from 'http-errors';
import {
  calculateMtm,
  checkMarketConditionsAndExecuteTrade,
  checkPositionToClose,
  getLtpData,
  getPositions,
  getPositionsJson,
  getScrip,
} from './helpers/apiService';
import { ALGO } from './helpers/constants';
import {
  getAtmStrikePrice,
  getOpenPositions,
  readJsonFile,
  setCred,
} from './helpers/functions';
import dotenv from 'dotenv';
import { Position } from './app.interface';
import { get } from 'lodash';
const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
dotenv.config();
const server: Server = createServer(app);
server.listen(process.env.PORT, () => {
  console.log(`${ALGO}: Server running on PORT number ${process.env.PORT}`);
});
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', lastUpdated: '2023-08-18, 00:33:00' });
});
process.on('uncaughtException', function (err) {
  console.log(err);
});
app.post('/check-positions-to-close', async (req: Request, res: Response) => {
  setCred(req);
  const currentPositions = await getPositions();
  const positions: Position[] = get(currentPositions, 'data', []) || [];
  const openPositions = getOpenPositions(positions);
  checkPositionToClose({ openPositions: openPositions });
  res.send().status(200);
});
app.post('/run-short-straddle-algo', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const response = await checkMarketConditionsAndExecuteTrade();
    console.log(`response: ${response}`);
    res.send({ response: response });
  } catch (err) {
    console.log(err);
    res.send({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
app.post('/get-atm-strike-price', async (req: Request, res: Response) => {
  setCred(req);
  res.json({ atm: await getAtmStrikePrice() });
});
app.post(
  '/script/details/get-script-ltp',
  async (req: Request, res: Response) => {
    setCred(req);
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
  setCred(req);
  const scriptName: string = req.body.scriptName;
  const strikePrice: string = req.body.strikePrice;
  const optionType: 'CE' | 'PE' = req.body.optionType || '';
  const expiryDate: string = req.body.expiryDate;
  res.send(await getScrip({ scriptName, strikePrice, optionType, expiryDate }));
});
app.post('/get-positions', async (req: Request, res: Response) => {
  setCred(req);
  const response = await getPositionsJson();
  res.send(response);
});
app.post('/calc-mtm', async (req: Request, res: Response) => {
  setCred(req);
  const response = await calculateMtm({ data: readJsonFile() });
  res.jsonp({ mtm: response });
});
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
