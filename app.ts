import { CLIENT_CODE, CLIENT_PASSWORD, API_KEY, STREAM_URL } from './constants';
import { ISmartApiData } from './app.interface';
import * as _ from 'lodash';
const express = require('express');
import { createServer } from 'http';
const { SmartAPI, WebSocket } = require('smartapi-javascript');
const app = express();
const server = createServer(app);
server.listen(5000, () => {
  
  const smart_api = new SmartAPI({
    api_key: API_KEY,
  });
  try {
    smart_api
      .generateSession(CLIENT_CODE, CLIENT_PASSWORD)
      .then((data: object) => {
        let smartApiData: ISmartApiData = _.get(data, 'data', {});
        liveFeed(smartApiData.feedToken);
      })
      .catch((err: object) => {
        throw err;
      });
  } catch (err) {
    throw err;
  }
});
const liveFeed = (feedToken: string) => {
  const web_socket = new WebSocket({
    client_code: CLIENT_CODE,
    feed_token: feedToken,
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
        bankNiftyIndex + '&' + bankNifty25Aug22FUT + '&' + bankNifty29SEP22FUT;
      web_socket.runScript(strWatchListScript, 'mw');
      /* setTimeout(function () {
        web_socket.close();
      }, 3000); */
    })
    .catch((err: any) => {
      throw err;
    });
  web_socket.on('tick', receiveTick);
};
const receiveTick = (obj: object[]) => {};
