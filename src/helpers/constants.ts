// constants.ts
/**
 * The URL for the Angel Broking streaming service.
 * @type {string}
 */
export const STREAM_URL = 'wss://omnefeeds.angelbroking.com/NestHtml5Mobile/socket/stream';
/**
 * The API endpoint for getting margin details.
 * @type {string}
 */
export const GET_MARGIN = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/getRMS';
/**
 * The API endpoint for placing an order.
 * @type {string}
 */
export const ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder';
/**
 * The API endpoint for modifying an order.
 * @type {string}
 */
export const MODIFY_ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/modifyOrder';
/**
 * The API endpoint for cancelling an order.
 * @type {string}
 */
export const CANCEL_ORDER_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/cancelOrder';
/**
 * The API endpoint for getting the order book.
 * @type {string}
 */
export const GET_ORDER_BOOK_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook';
/**
 * The API endpoint for getting the trade book.
 * @type {string}
 */
export const GET_TRAD_BOOK_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getTradeBook';
/**
 * The API endpoint for getting LTP data.
 * @type {string}
 */
export const GET_LTP_DATA_API =
  'https://apiconnect.angelbroking.com/order-service/rest/secure/angelbroking/order/v1/getLtpData';
/**
 * The URL for the scrip master file.
 * @type {string}
 */
export const SCRIPMASTER = 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json';
/**
 * The API endpoint for the order book.
 * @type {string}
 */
export const ORDERBOOK_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook';
/**
 * The variety type for a normal order.
 * @type {string}
 */
export const VARIETY_NORMAL = 'NORMAL';
/**
 * The variety type for a stoploss order.
 * @type {string}
 */
export const VARIETY_STOPLOSS = 'STOPLOSS';
/**
 * The variety type for an AMO (After Market Order).
 * @type {string}
 */
export const VARIETY_AMO = 'AMO';
/**
 * The variety type for a robo order.
 * @type {string}
 */
export const VARIETY_ROBO = 'ROBO';
/**
 * The transaction type for a buy order.
 * @type {string}
 */
export const TRANSACTION_TYPE_BUY = 'BUY';
/**
 * The transaction type for a sell order.
 * @type {string}
 */
export const TRANSACTION_TYPE_SELL = 'SELL';
/**
 * The default port for the application.
 * @type {number}
 */
export const PORT = 8000;
/**
 * The strike difference for intraday trading.
 * @type {number}
 */
export const STRIKE_DIFFERENCE = 200;
/**
 * The strike difference for positional trading.
 * @type {number}
 */
export const STRIKE_DIFFERENCE_POSITIONAL = 500;
/**
 * A message indicating that the conditions are not right to take a trade.
 * @type {string}
 */
export const MESSAGE_NOT_TAKE_TRADE = 'Conditions not right to take trade';
/**
 * The name of the user.
 * @type {string}
 */
export const ME = 'Kunal';
/**
 * The name of the algorithm.
 * @type {string}
 */
export const ALGO = 'Algo';
/**
 * The API endpoint for historical data.
 * @type {string}
 */
export const HISTORIC_API = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData';
/**
 * The date format used in the application.
 * @type {string}
 */
export const DATEFORMAT = 'DDMMMYYYY';
/**
 * The loss per lot.
 * @type {number}
 */
export const LOSSPERLOT = 3500;
/**
 * The number of lots to trade.
 * @type {number}
 */
export const LOTS = 1;
/**
 * The API endpoint for searching scrips.
 * @type {string}
 */
export const SEARCHSCRIPAPI = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/searchScrip';
/**
 * The order status for pending orders.
 * @type {string}
 */
export const PENDING_ORDER_STATUS = 'Pending';
