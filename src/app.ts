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
  checkToRepeatShortStraddle,
  closeTrade,
  getLtpData,
  getScrip,
  shortStraddle,
} from './helpers/apiService';
import {
  createJsonFile,
  getAtmStrikePrice,
  isPastTime,
  readJsonFile,
  writeJsonFile,
} from './helpers/functions';
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
  if (!isPastTime({ hours: 10, minutes: 15 })) {
    res.json({
      mtm: 'Wait it is not over 10:15 am',
    });
  } else {
    let data = createJsonFile();
    if (!data.isTradeExecuted) {
      const shortStraddleData = await shortStraddle();
      if (shortStraddleData.ceOrderStatus && shortStraddleData.peOrderStatus) {
        data.isTradeExecuted = true;
        data.tradeDetails.push({
          call: {
            strike: shortStraddleData.stikePrice,
            token: shortStraddleData.ceOrderToken,
            symbol: shortStraddleData.ceOrderSymbol,
          },
          put: {
            strike: shortStraddleData.stikePrice,
            token: shortStraddleData.peOrderToken,
            symbol: shortStraddleData.peOrderSymbol,
          },
        });
        writeJsonFile(data);
      }
    } else {
      const atmStrike = await getAtmStrikePrice();
      const no_of_trades = data.tradeDetails.length;
      const previousTradeStrikePrice = get(
        data,
        `tradeDetails.${no_of_trades - 1}.call.strike`,
        ''
      );
      checkToRepeatShortStraddle(
        atmStrike,
        parseInt(previousTradeStrikePrice),
        data
      );
    }
    let mtmData = await calculateMtm({ data: readJsonFile() });
    if (mtmData > 2000 || isPastTime({ hours: 15, minutes: 25 })) {
      closeTrade(readJsonFile());
      res.json({
        mtm: 'Trade Closed',
      });
    } else {
      res.json({
        mtm: mtmData,
      });
    }
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
