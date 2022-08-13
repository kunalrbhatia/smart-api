import { CLIENT_CODE, CLIENT_PASSWORD, API_KEY, STREAM_URL } from './constants';
import { ISmartApiData } from './app.interface';
import { Server, createServer } from 'http';
import cors from 'cors';
import * as _ from 'lodash';
import express, {
  Request,
  Response,
  NextFunction,
  Application,
  ErrorRequestHandler,
} from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import createHttpError from 'http-errors';
const { SmartAPI, WebSocket } = require('smartapi-javascript');
const WebSocketServer = require('ws');
const app: Application = express();
app.use(bodyParser.json());
app.use(cors());
const server: Server = createServer(app);
const wss = new WebSocketServer.Server({ server: server });
let scripMaster: object[];
wss.on('connection', (ws: any) => {
  const smart_api = new SmartAPI({
    api_key: API_KEY,
  });
  smart_api
    .generateSession(CLIENT_CODE, CLIENT_PASSWORD)
    .then((data: object) => {
      let smartApiData: ISmartApiData = _.get(data, 'data', {});
      const web_socket = new WebSocket({
        client_code: CLIENT_CODE,
        feed_token: smartApiData.feedToken,
        url: STREAM_URL,
      });
      web_socket
        .connect()
        .then(() => {
          const bnIndexInstrumentToken = '26009';
          const bankNiftyIndex = 'nse_cm|' + bnIndexInstrumentToken;
          const bnCurrentFutInstrumentToken = '82221';
          const bankNifty25Aug22FUT = 'nse_fo|' + bnCurrentFutInstrumentToken;
          const bnNextFutInstrumentToken = '37516';
          const bankNifty29SEP22FUT = 'nse_fo|' + bnNextFutInstrumentToken;
          const strWatchListScript =
            bankNiftyIndex +
            '&' +
            bankNifty25Aug22FUT +
            '&' +
            bankNifty29SEP22FUT;
          web_socket.runScript(strWatchListScript, 'mw');
          setTimeout(function () {
            web_socket.close();
          }, 3000);
        })
        .catch((err: any) => {
          throw err;
        });
      web_socket.on('tick', (obj: object[]) => {
        ws.send(JSON.stringify(obj));
      });
    })
    .catch((err: object) => {
      throw err;
    });
  // sending message
  ws.on('message', (data: object) => {
    console.log(`Client has sent us: ${data}`);
  });
  // handling what to do when clients disconnects from server
  ws.on('close', () => {
    console.log('the client has connected');
  });
  // handling client connection error
  ws.onerror = function () {
    console.log('Some Error occurred');
  };
});
const fetchData = async () => {
  try {
    await axios
      .get(
        'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json'
      )
      .then((response: object) => {
        let acData: object[] = _.get(response, 'data', []) || [];
        scripMaster = acData.map((element, index) => {
          return {
            ...element,
            label: _.get(element, 'name', 'NONAME') || 'NONAME',
            key: '0' + index + _.get(element, 'token', '00') || '00',
          };
        });
      })
      .catch((evt: object) => {
        console.log(evt);
      });
  } catch (error) {
    console.error(_.get(error, 'message', '') || '');
  }
};
server.listen(5000, () => {});
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello World!' });
});
app.get(
  '/getScripDetails/:scriptName/:exchSeg',
  (req: Request, res: Response) => {
    const scriptName: string = req.params.scriptName;
    const exchSeg: string = req.params.exchSeg;
    if (_.isArray(scripMaster) && scripMaster.length > 0) {
      const scrip: object = scripMaster.filter(
        (scrip) =>
          _.get(scrip, 'name', '') === scriptName &&
          _.get(scrip, 'exch_seg', '') === exchSeg
      );
      if (scrip) res.json(scrip);
      else res.json({ status: 'Scrip not found' });
    } else res.json({ status: 'pending' });
  }
);
app.post('/getScripDetails', (req: Request, res: Response) => {
  const scriptName: string = req.body.scriptName;
  console.log(scriptName);
  const exchSeg: string = req.body.exchSeg;
  if (scriptName) {
    if (_.isArray(scripMaster) && scripMaster.length > 0) {
      let scrip: object = {};
      if (exchSeg) {
        scrip = scripMaster.filter(
          (scrip) =>
            _.get(scrip, 'name', '') === scriptName &&
            _.get(scrip, 'exch_seg', '') === exchSeg
        );
      } else {
        scrip = scripMaster.filter(
          (scrip) => _.get(scrip, 'name', '') === scriptName
        );
      }
      if (scrip) res.json(scrip);
      else res.json({ status: 'Scrip not found' });
    } else res.json({ status: 'pending' });
  } else {
    res.json({ status: 'scriptName is mandatory' });
  }
});
app.post('/scrip/details/get-script', (req: Request, res: Response) => {
  const scriptName: string = req.body.scriptName;
  if (scriptName && _.isArray(scripMaster) && scripMaster.length > 0) {
    let scrips = scripMaster.filter((scrip) => {
      const _scripName: string = _.get(scrip, 'name', '') || '';
      return (_scripName.indexOf(scriptName) > 0 ||
        _scripName === scriptName) &&
        _.get(scrip, 'exch_seg', '') === 'NFO' &&
        (_.get(scrip, 'instrumenttype', '') === 'FUTSTK' ||
          _.get(scrip, 'instrumenttype', '') === 'FUTIDX') &&
        parseInt(_.get(scrip, 'lotsize', '')) > 1
        ? scrip
        : null;
    });
    scrips = scrips.map((element: object, index: number) => {
      return {
        ...element,
        label: _.get(element, 'name', 'NoName') || 'NoName',
        key: index,
      };
    });
    res.json(scrips);
  } else {
    res.status(200).json({ message: 'pending' });
  }
});
fetchData();
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new createHttpError.NotFound());
});
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.status || 500);
  res.send({ status: err.status || 500, message: err.message });
};
app.use(errorHandler);
