"use strict";

// constants.ts
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ALGO = exports.ME = exports.MESSAGE_NOT_TAKE_TRADE = exports.STRIKE_DIFFERENCE = exports.MTMDATATHRESHOLD = exports.PORT = exports.TRANSACTION_TYPE_SELL = exports.TRANSACTION_TYPE_BUY = exports.SHORT_DELAY = exports.DELAY = exports.VARIETY_ROBO = exports.VARIETY_AMO = exports.VARIETY_STOPLOSS = exports.VARIETY_NORMAL = exports.GET_POSITIONS = exports.SCRIPMASTER = exports.GET_LTP_DATA_API = exports.GET_TRAD_BOOK_API = exports.GET_ORDER_BOOK_API = exports.CANCEL_ORDER_API = exports.MODIFY_ORDER_API = exports.ORDER_API = exports.GET_MARGIN = exports.STREAM_URL = void 0;
exports.STREAM_URL = 'wss://omnefeeds.angelbroking.com/NestHtml5Mobile/socket/stream';
exports.GET_MARGIN = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/getRMS';
exports.ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder';
exports.MODIFY_ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/modifyOrder';
exports.CANCEL_ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/cancelOrder';
exports.GET_ORDER_BOOK_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook';
exports.GET_TRAD_BOOK_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getTradeBook';
exports.GET_LTP_DATA_API = 'https://apiconnect.angelbroking.com/order-service/rest/secure/angelbroking/order/v1/getLtpData';
exports.SCRIPMASTER = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
exports.GET_POSITIONS = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPosition';
exports.VARIETY_NORMAL = 'NORMAL';
exports.VARIETY_STOPLOSS = 'STOPLOSS';
exports.VARIETY_AMO = 'AMO';
exports.VARIETY_ROBO = 'ROBO';
exports.DELAY = 1000;
exports.SHORT_DELAY = 500;
exports.TRANSACTION_TYPE_BUY = 'BUY';
exports.TRANSACTION_TYPE_SELL = 'SELL';
exports.PORT = 8000;
exports.MTMDATATHRESHOLD = 2000;
exports.STRIKE_DIFFERENCE = 200;
exports.MESSAGE_NOT_TAKE_TRADE = 'Conditions not right to take trade';
exports.ME = 'Kunal';
exports.ALGO = 'Algo';