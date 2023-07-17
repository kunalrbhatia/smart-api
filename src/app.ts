import { DELAY } from './constants';
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
import createHttpError from 'http-errors';
import { getLtpData, getPositions, getScrip } from './helpers/apiService';
import {
  delay,
  getAtmStrikePrice,
  getNextExpiry,
  isPastTime,
} from './helpers/functions';
const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
const server: Server = createServer(app);
let stremMsg: object = { message: 'no_message', status: 'in progress' };
const doOrder = () => {};
server.listen(5000, () => {});
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
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
app.post('/run-algo', async (req: Request, res: Response) => {
  //CHECK IF IT IS PAST 10:15
  while (!isPastTime()) {
    await delay({ milliSeconds: DELAY });
  }
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
  //GET CALL LTP
  const ltpCE = await getLtpData({
    exchange: get(ceToken, '0.exch_seg'),
    tradingsymbol: get(ceToken, '0.symbol'),
    symboltoken: get(ceToken, '0.token'),
  });
  await delay({ milliSeconds: DELAY });
  //GET PUT LTP
  const ltpPE = await getLtpData({
    exchange: get(peToken, '0.exch_seg'),
    tradingsymbol: get(peToken, '0.symbol'),
    symboltoken: get(peToken, '0.token'),
  });
  await delay({ milliSeconds: DELAY });
  const currentPositions = await getPositions();
  const currentPositionsData: object[] = get(currentPositions, 'data');
  let mtm = 0;
  currentPositionsData.forEach((value) => {
    mtm += parseInt(get(value, 'unrealised'));
  });
  res.json({
    message: 'Success: ',
    currentPositions: currentPositions,
    ltpCE,
    ltpPE,
    expiryDate,
    mtm,
  });
});
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
