"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VARIETY_STOPLOSS = exports.VARIETY_ROBO = exports.VARIETY_NORMAL = exports.VARIETY_AMO = exports.TRANSACTION_TYPE_SELL = exports.TRANSACTION_TYPE_BUY = exports.STRIKE_DIFFERENCE_POSITIONAL = exports.STRIKE_DIFFERENCE = exports.STREAM_URL = exports.SHORT_DELAY = exports.SCRIPMASTER = exports.PORT = exports.ORDER_API = exports.MTMDATATHRESHOLDPOSITIONAL = exports.MTMDATATHRESHOLD = exports.MODIFY_ORDER_API = exports.MESSAGE_NOT_TAKE_TRADE = exports.ME = exports.HISTORIC_API = exports.GET_TRAD_BOOK_API = exports.GET_POSITIONS = exports.GET_ORDER_BOOK_API = exports.GET_MARGIN = exports.GET_LTP_DATA_API = exports.DELAY = exports.CANCEL_ORDER_API = exports.BIG_DELAY = exports.ALGO = void 0;
// constants.ts

var STREAM_URL = 'wss://omnefeeds.angelbroking.com/NestHtml5Mobile/socket/stream';
exports.STREAM_URL = STREAM_URL;
var GET_MARGIN = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/getRMS';
exports.GET_MARGIN = GET_MARGIN;
var ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder';
exports.ORDER_API = ORDER_API;
var MODIFY_ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/modifyOrder';
exports.MODIFY_ORDER_API = MODIFY_ORDER_API;
var CANCEL_ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/cancelOrder';
exports.CANCEL_ORDER_API = CANCEL_ORDER_API;
var GET_ORDER_BOOK_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook';
exports.GET_ORDER_BOOK_API = GET_ORDER_BOOK_API;
var GET_TRAD_BOOK_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getTradeBook';
exports.GET_TRAD_BOOK_API = GET_TRAD_BOOK_API;
var GET_LTP_DATA_API = 'https://apiconnect.angelbroking.com/order-service/rest/secure/angelbroking/order/v1/getLtpData';
exports.GET_LTP_DATA_API = GET_LTP_DATA_API;
var SCRIPMASTER = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
exports.SCRIPMASTER = SCRIPMASTER;
var GET_POSITIONS = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPosition';
exports.GET_POSITIONS = GET_POSITIONS;
var VARIETY_NORMAL = 'NORMAL';
exports.VARIETY_NORMAL = VARIETY_NORMAL;
var VARIETY_STOPLOSS = 'STOPLOSS';
exports.VARIETY_STOPLOSS = VARIETY_STOPLOSS;
var VARIETY_AMO = 'AMO';
exports.VARIETY_AMO = VARIETY_AMO;
var VARIETY_ROBO = 'ROBO';
exports.VARIETY_ROBO = VARIETY_ROBO;
var DELAY = 1000;
exports.DELAY = DELAY;
var BIG_DELAY = 15000;
exports.BIG_DELAY = BIG_DELAY;
var SHORT_DELAY = 500;
exports.SHORT_DELAY = SHORT_DELAY;
var TRANSACTION_TYPE_BUY = 'BUY';
exports.TRANSACTION_TYPE_BUY = TRANSACTION_TYPE_BUY;
var TRANSACTION_TYPE_SELL = 'SELL';
exports.TRANSACTION_TYPE_SELL = TRANSACTION_TYPE_SELL;
var PORT = 8000;
exports.PORT = PORT;
var MTMDATATHRESHOLD = 2000;
exports.MTMDATATHRESHOLD = MTMDATATHRESHOLD;
var MTMDATATHRESHOLDPOSITIONAL = 10000;
exports.MTMDATATHRESHOLDPOSITIONAL = MTMDATATHRESHOLDPOSITIONAL;
var STRIKE_DIFFERENCE = 200;
exports.STRIKE_DIFFERENCE = STRIKE_DIFFERENCE;
var STRIKE_DIFFERENCE_POSITIONAL = 500;
exports.STRIKE_DIFFERENCE_POSITIONAL = STRIKE_DIFFERENCE_POSITIONAL;
var MESSAGE_NOT_TAKE_TRADE = 'Conditions not right to take trade';
exports.MESSAGE_NOT_TAKE_TRADE = MESSAGE_NOT_TAKE_TRADE;
var ME = 'Kunal';
exports.ME = ME;
var ALGO = 'Algo';
exports.ALGO = ALGO;
var HISTORIC_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData';
exports.HISTORIC_API = HISTORIC_API;