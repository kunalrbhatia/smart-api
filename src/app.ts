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
import { checkMarketConditionsAndExecuteTrade } from './helpers/apiService';
import { ALGO } from './helpers/constants';
import { setCred } from './helpers/functions';
import dotenv from 'dotenv';
import { Strategy } from './app.interface';
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
app.post('/run-short-straddle-algo', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const lots: number = req.body.lots;
    const lossPerLot: number = req.body.loss_per_lot;
    // console.log(`${ALGO}: lots: ${lots}`);
    const response = await checkMarketConditionsAndExecuteTrade(
      lots,
      lossPerLot
    );
    //console.log(`${ALGO} response: ${response}`);
    res.send({ response: response });
  } catch (err) {
    console.log(err);
    res.send({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
