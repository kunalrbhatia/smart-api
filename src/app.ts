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
  getLtpData,
  getPositions,
  getScrip,
  shortStraddle,
} from './helpers/apiService';
import { createJsonFile, delay, isPastTime } from './helpers/functions';
import { DELAY } from './constants';
import { get } from 'lodash';
const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
const server: Server = createServer(app);
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
  let data = createJsonFile();
  // CHECK IF IT IS PAST 10:15
  while (!isPastTime()) {
    await delay({ milliSeconds: DELAY });
  }
  const shortStraddleData = await shortStraddle();
  if (shortStraddleData.ceOrderStatus && shortStraddleData.peOrderStatus) {
    data.isTradeExecuted = true;
    data.tradeDetails.push({
      mtmTotal: 0,
      call: {
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.ceOrderToken,
        mtm: 0,
      },
      put: {
        strike: shortStraddleData.stikePrice,
        token: shortStraddleData.peOrderToken,
        mtm: 0,
      },
    });
  }
  
  let mtmData = await calculateMtm({ data });
  

  // DO ORDER WITH ONE LOT
  // KEEP CHECKING IN AN INTERVAL OF 5 MINS THAT BNF HAS MADE PLUS OR MINUS 300 POINTS FROM THE TIME OF ORDER PUNCHED
  // IF BNF MOVED MORE THAN 300 POINTS THEN DO ORDER AGAIN WITH 1 MORE LOT
  // ELSE KEEP WAITING
  // CLOSE POSITION ON OR AFTER 3:25 BUT BEFORE 3:30
  res.json({
    message: 'Success: ',
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
