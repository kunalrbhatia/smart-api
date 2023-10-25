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
import cron from 'node-cron';
import {
  calculateMtm,
  checkMarketConditionsAndExecuteTrade,
  checkPositionToClose,
  generateSmartSession,
  getLtpData,
  getPositions,
  getPositionsJson,
  getScrip,
  runOrb,
  runRsiAlgo,
} from './helpers/apiService';
import { ALGO } from './helpers/constants';
import {
  getAtmStrikePrice,
  getOpenPositions,
  readJsonFile,
  setCred,
  setSmartSession,
} from './helpers/functions';
import dotenv from 'dotenv';
import { Position, TradeType, bodyType, reqType } from './app.interface';
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
  checkPositionToClose({
    openPositions: openPositions,
    tradeType: TradeType.INTRADAY,
  });
  res.send().status(200);
});
app.post('/run-rsi-algo', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const smartData = await generateSmartSession();
    setSmartSession(smartData);
    const response = await runRsiAlgo();
    console.log(`response: ${response}`);
    res.send({ response: response });
  } catch (err) {
    console.log(err);
    res.send({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
app.post('/run-short-straddle-algo', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const response = await checkMarketConditionsAndExecuteTrade(
      TradeType.INTRADAY
    );
    console.log(`response: ${response}`);
    res.send({ response: response });
  } catch (err) {
    console.log(err);
    res.send({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
app.post('/orb', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^ORB STARTS^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const scriptName: string = req.body.script_name;
    const price: number = req.body.price;
    const maxSl: number = req.body.max_sl || -2000;
    const trailSl: number = req.body.trail_sl || 500;
    const tradeDirection: 'up' | 'down' = req.body.trade_direction;
    const response = await runOrb({
      scriptName,
      price,
      maxSl,
      tradeDirection,
      trailSl,
    });
    res.send(response);
  } catch (err) {
    console.log(err);
    res.send({ response: err });
  }
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^ORB ENDS^^^^^^^^^^^^^^`);
});
app.post(
  '/run-short-straddle-positional-algo',
  async (req: Request, res: Response) => {
    console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
    try {
      const istTz = new Date().toLocaleString('default', {
        timeZone: 'Asia/Kolkata',
      });
      console.log(`${ALGO}: time, ${istTz}`);
      setCred(req);
      const response = await checkMarketConditionsAndExecuteTrade(
        TradeType.POSITIONAL
      );
      console.log(`response: ${response}`);
      res.send({ response: response });
    } catch (err) {
      console.log(err);
      res.send({ response: err });
    }
    console.log(`${ALGO}: -----------------------------------`);
  }
);
if (process.env.NODE_ENV === 'development') {
  cron.schedule('*/5 * * * *', async () => {
    console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
    try {
      const istTz = new Date().toLocaleString('default', {
        timeZone: 'Asia/Kolkata',
      });
      console.log(`${ALGO}: time, ${istTz}`);
      const body: bodyType = {
        api_key: process.env.API_KEY ?? '',
        client_code: process.env.CLIENT_CODE ?? '',
        client_pin: process.env.CLIENT_PIN ?? '',
        client_totp_pin: process.env.CLIENT_TOTP_PIN ?? '',
      };
      const req: reqType = {
        body: body,
      };
      setCred(req);
      const response = await checkMarketConditionsAndExecuteTrade(
        TradeType.INTRADAY
      );
      console.log(`response: ${response}`);
    } catch (err) {
      console.log(err);
    }
    console.log(`${ALGO}: -----------------------------------`);
  });
}
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
  const response = await getPositionsJson(TradeType.POSITIONAL);
  res.send(response);
});
app.post('/calc-mtm', async (req: Request, res: Response) => {
  setCred(req);
  const response = await calculateMtm({
    data: readJsonFile(TradeType.INTRADAY),
  });
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
