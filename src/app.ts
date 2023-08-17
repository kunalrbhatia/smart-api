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
  checkMarketConditionsAndExecuteTrade,
  getLtpData,
  getPositionsJson,
  getScrip,
} from './helpers/apiService';
import { ALGO } from './helpers/constants';
import { getAtmStrikePrice } from './helpers/functions';
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
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    const response = await checkMarketConditionsAndExecuteTrade();
    console.log(`response: ${response}`);
  } catch (err) {
    console.log(err);
  }
  console.log(`${ALGO}: -----------------------------------`);
});
app.post('/get-atm-strike-price', async (req: Request, res: Response) => {
  res.json({ atm: await getAtmStrikePrice() });
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
app.post('/get-positions', async (req: Request, res: Response) => {
  const response = await getPositionsJson();
  res.send(response);
});
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
