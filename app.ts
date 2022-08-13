import { CLIENT_CODE, CLIENT_PASSWORD, API_KEY, STREAM_URL } from './constants';
import { ISmartApiData } from './app.interface';
import * as _ from 'lodash';
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
import { createServer } from 'http';
const { SmartAPI, WebSocket } = require('smartapi-javascript');
const WebSocketServer = require('ws');
const app = express();
app.use(express.json());
app.use(bodyParser.json());
const server = createServer(app);
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
server.listen(5000, () => {
  app.get('/', (req: any, res: any) => {
    res.json({ message: 'Hello World!' });
  });
  app.get('/getScripDetails/:scriptName/:exchSeg', (req: any, res: any) => {
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
  });
  app.post('/getScripDetails', (req: any, res: any) => {
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
  fetchData();
});
