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
  closeTrade,
  getLtpData,
  getPositions,
  getPositionsJson,
  getScrip,
  runRsiAlgo,
} from './helpers/apiService';
import { ALGO } from './helpers/constants';
import {
  getAtmStrikePrice,
  getOpenPositions,
  readJsonFile,
  setCred,
} from './helpers/functions';
import dotenv from 'dotenv';
import {
  Position,
  Strategy,
  TradeType,
  bodyType,
  reqType,
} from './app.interface';
import { get } from 'lodash';
import { Socket } from 'net';
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
let connections: Socket[] = [];
server.on('connection', (connection) => {
  connections.push(connection);
  connection.on(
    'close',
    () => (connections = connections.filter((curr) => curr !== connection))
  );
});
app.get('/kill', (req, res) => {
  setTimeout(() => {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
      console.log('Closed out remaining connections');
      process.exit(0);
    });
    setTimeout(() => {
      console.error(
        'Could not close connections in time, forcefully shutting down'
      );
      process.exit(1);
    }, 10000);
    connections.forEach((curr) => curr.end());
    setTimeout(() => connections.forEach((curr) => curr.destroy()), 5000);
  }, 1000);
  res.send("Execution of the 'Kill Algo' command has been initiated.");
});
app.post('/closeTrade', async (req: Request, res: Response) => {
  setCred(req);
  await closeTrade(TradeType.POSITIONAL);
  res.send({ ok: 123 });
});
app.post('/check-positions-to-close', async (req: Request, res: Response) => {
  setCred(req);
  const currentPositions = await getPositions();
  const positions: Position[] = get(currentPositions, 'data', []) || [];
  const openPositions = getOpenPositions(positions, TradeType.INTRADAY);
  checkPositionToClose({
    openPositions: openPositions,
    tradeType: TradeType.INTRADAY,
  });
  res.send().status(200);
});
app.post('/rsi', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const response = await runRsiAlgo();
    //console.log(`response: ${response}`);
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
    const lots: number = req.body.lots;
    // console.log(`${ALGO}: lots: ${lots}`);
    const response = await checkMarketConditionsAndExecuteTrade(
      TradeType.INTRADAY,
      Strategy.SHORTSTRADDLE,
      lots
    );
    //console.log(`${ALGO} response: ${response}`);
    res.send({ response: response });
  } catch (err) {
    console.log(err);
    res.send({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
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
      // console.log(`response: ${response}`);
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
    tradeType: TradeType.POSITIONAL,
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
