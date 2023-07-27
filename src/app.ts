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
  closeTrade,
  executeTrade,
  getLtpData,
  getScrip,
} from './helpers/apiService';
import {
  isMarketClosed,
  isCurrentTimeGreater,
  createJsonFile,
} from './helpers/functions';

const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
const server: Server = createServer(app);
server.listen(process.env.PORT, () => {});
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', lastUpdated: '2023-07-27, 21:07:20' });
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
  let data = createJsonFile();
  if (isMarketClosed()) {
    res.json({
      mtm: 'Market Closed',
    });
  } else if (!isCurrentTimeGreater({ hours: 10, minutes: 15 })) {
    res.json({
      mtm: 'Wait it is not over 10:15 am',
    });
  } else if (data.isTradeClosed) {
    res.json({
      mtm: 'Trade already closed!',
    });
  } else {
    const tradeData = await executeTrade();
    res.json({ mtm: tradeData });
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
