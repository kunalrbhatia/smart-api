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
  closeTrade,
  getLtpData,
  getMarginDetails,
  getPositions,
  getScrip,
  repeatShortStraddle,
  shortStraddle,
} from './helpers/apiService';
import {
  checkStrike,
  createJsonFile,
  delay,
  getAtmStrikePrice,
  isPastTime,
  readJsonFile,
  writeJsonFile,
} from './helpers/functions';
import { DELAY } from './constants';
import { get } from 'lodash';
import { JsonFileStructure } from './app.interface';
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
  while (!isPastTime({ hours: 10, minutes: 15 })) {
    await delay({ milliSeconds: DELAY });
  }

  let data = createJsonFile();
  if (!data.isTradeExecuted) {
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
  } else {
    let reformedData: JsonFileStructure;
    const atmStrike = await getAtmStrikePrice();
    const no_of_trades = data.tradeDetails.length;
    const previousTradeStrikePrice = get(
      data,
      `tradeDetails.${no_of_trades - 1}.call.strike`,
      ''
    );
    if (atmStrike > parseInt(previousTradeStrikePrice)) {
      const difference = atmStrike - parseInt(previousTradeStrikePrice);
      reformedData = await repeatShortStraddle(difference, data, atmStrike);
      writeJsonFile(reformedData);
    } else if (atmStrike < parseInt(previousTradeStrikePrice)) {
      const difference = parseInt(previousTradeStrikePrice) - atmStrike;
      reformedData = await repeatShortStraddle(difference, data, atmStrike);
      writeJsonFile(reformedData);
    }
  }
  let mtmData = await calculateMtm({ data });
  if (mtmData > 2000) {
    const updatedJson = readJsonFile();
    closeTrade(updatedJson);
    res.json({
      message: 'Trade Closed',
    });
  }
  if (!isPastTime({ hours: 15, minutes: 25 })) {
    const updatedJson = readJsonFile();
    closeTrade(updatedJson);
    res.json({
      message: 'Trade Closed',
    });
  }
  res.json({
    message: 'Trade Executed',
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
