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
  getLtpData,
  getScrip,
} from './helpers/apiService';
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


// app.post('/run-algo', async (req: Request, res: Response) => {

//   //CHECK IF IT IS PAST 10:15
//   // while (!isPastTime()) {
//   //   await delay({ milliSeconds: DELAY });
//   // }
//   await shortStraddle();
//   // const currentPositions = await getPositions();
//   // const currentPositionsData: object[] = get(currentPositions, 'data');
//   // let mtm = 0;
//   // currentPositionsData.forEach((value) => {
//   //   mtm += parseInt(get(value, 'unrealised'));
//   // });
//   // DO ORDER WITH ONE LOT
//   // KEEP CHECKING IN AN INTERVAL OF 5 MINS THAT BNF HAS MADE PLUS OR MINUS 300 POINTS FROM THE TIME OF ORDER PUNCHED
//   // IF BNF MOVED MORE THAN 300 POINTS THEN DO ORDER AGAIN WITH 1 MORE LOT
//   // ELSE KEEP WAITING
//   // CLOSE POSITION ON OR AFTER 3:25 BUT BEFORE 3:30
//   res.json({
//     message: 'Success: ',
//   });
// });
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
