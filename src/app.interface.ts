/**
 * Interface for Smart API data.
 */
export interface ISmartApiData {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}
/**
 * Interface for trade details.
 */
export interface TradeDetails {
  netQty: string;
  optionType: 'CE' | 'PE';
  strike: string;
  token: string;
  symbol: string;
  closed: boolean;
  expireDate: string;
  tradedPrice: number;
  tradingSymbol: string;
  exchange: string;
}
/**
 * Interface for MTM (Mark to Market) value.
 */
export interface MtmValue {
  time: string;
  value: string;
}
/**
 * Interface for historical data request.
 */
export interface HistoryInterface {
  exchange: string;
  symboltoken: string;
  interval: string;
  fromdate: string;
  todate: string;
}
/**
 * Enum for history interval.
 */
export enum HistoryInterval {
  ONE_MINUTE = 'ONE_MINUTE',
  THREE_MINUTE = 'THREE_MINUTE',
  FIVE_MINUTE = 'FIVE_MINUTE',
  TEN_MINUTE = 'TEN_MINUTE',
  FIFTEEN_MINUTE = 'FIFTEEN_MINUTE',
  THIRTY_MINUTE = 'THIRTY_MINUTE',
  ONE_HOUR = 'ONE_HOUR',
  ONE_DAY = 'ONE_DAY',
}
/**
 * Enum for trading strategy.
 */
export enum Strategy {
  RSI = 'rsi',
  SHORTSTRADDLE = 'shortStraddle',
}
/**
 * Interface for the structure of the JSON file.
 */
export interface JsonFileStructure {
  isTradeExecuted: boolean;
  tradeDate?: string;
  accountDetails: {
    capitalUsed: number;
  };
  tradeDetails: TradeDetails[];
  isTradeClosed: boolean;
  mtm: MtmValue[];
}
/**
 * Type for position details.
 */
export type Position = {
  symboltoken: string;
  symbolname: string;
  instrumenttype: string;
  priceden: string;
  pricenum: string;
  genden: string;
  gennum: string;
  precision: string;
  multiplier: string;
  boardlotsize: string;
  exchange: string;
  producttype: string;
  tradingsymbol: string;
  symbolgroup: string;
  strikeprice: string;
  optiontype: 'CE' | 'PE';
  expirydate: string;
  lotsize: string;
  cfbuyqty: string;
  cfsellqty: string;
  cfbuyamount: string;
  cfsellamount: string;
  buyavgprice: string;
  sellavgprice: string;
  avgnetprice: string;
  netvalue: string;
  netqty: string;
  totalbuyvalue: string;
  totalsellvalue: string;
  cfbuyavgprice: string;
  cfsellavgprice: string;
  totalbuyavgprice: string;
  totalsellavgprice: string;
  netprice: string;
  buyqty: string;
  sellqty: string;
  buyamount: string;
  sellamount: string;
  pnl: string;
  realised: string;
  unrealised: string;
  ltp: string;
  close: string;
};
/**
 * Type for user credentials.
 */
export type Credentails = {
  APIKEY: string;
  CLIENT_CODE: string;
  CLIENT_PIN: string;
  CLIENT_TOTP_PIN: string;
};
/**
 * Type for order store data.
 */
export type OrderStoreDataType = {
  QUANTITY: number;
  EXPIRYDATE: string;
  INDEX: string;
  LOSSPERLOT: number;
  INDIAVIX: number;
};
/**
 * Type for scrip master store data.
 */
export type ScripMasterStoreDataType = {
  SCRIP_MASTER_JSON: object[];
};
/**
 * Type for checking if a position exists.
 */
export type CheckPosition = { position: Position; trades: TradeDetails[] };
/**
 * Type for getting LTP data.
 */
export type getLtpDataType = {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
};
/**
 * Type for LTP data.
 */
export type LtpDataType = {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ltp: number;
};
/**
 * Type for getting future scrip data.
 */
export type getScripFutType = {
  scriptName: string;
};
/**
 * Type for getting scrip data.
 */
export type getScripType = {
  scriptName: string;
  strikePrice?: string;
  optionType?: 'CE' | 'PE';
  expiryDate: string;
};
/**
 * Type for scrip master response.
 */
export type scripMasterResponse = {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
};
/**
 * Type for placing an order.
 */
export type doOrderType = {
  tradingsymbol: string;
  symboltoken: string;
  transactionType: string | undefined;
  productType?: 'DELIVERY' | 'CARRYFORWARD' | 'MARGIN' | 'INTRADAY' | 'BO';
  lotSize: number;
  variety: 'NORMAL' | 'STOPLOSS';
  ordertype: 'MARKET' | 'LIMIT' | 'STOPLOSS_LIMIT' | 'STOPLOSS_MARKET';
  triggerprice?: number;
  price?: number;
  isHedge?: boolean;
};
/**
 * Type for order response.
 */
export type doOrderResponse = {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    script: string;
    orderid: string;
  };
};
/**
 * Type for getting position by token.
 */
export type getPositionByTokenType = {
  positions: Position[];
  token: string;
};
/**
 * Type for deciding whether to close a trade.
 */
export type shouldCloseTradeType = {
  ltp: number;
  avg: number;
  trade: Position;
};
/**
 * Type for delay.
 */
export type delayType = {
  milliSeconds: number | undefined | string;
};
/**
 * Type for time comparison.
 */
export type TimeComparisonType = { hours: number; minutes: number };
/**
 * Type for request body.
 */
export type bodyType = {
  api_key: string;
  client_code: string;
  client_pin: string;
  client_totp_pin: string;
};
/**
 * Type for request.
 */
export type reqType = { body: bodyType };
/**
 * Type for short straddle data.
 */
export type ShortStraddleData = {
  stikePrice: string;
  expiryDate: string;
  netQty: string;
  ceOrderToken: string;
  peOrderToken: string;
  ceOrderSymbol: string;
  peOrderSymbol: string;
  ceOrderStatus: boolean;
  peOrderStatus: boolean;
};
/**
 * Type for adding short straddle data.
 */
export type AddShortStraddleData = {
  data: JsonFileStructure;
  shortStraddleData: ShortStraddleData;
};
/**
 * Type for checking if both CE and PE are present.
 */
export type BothPresent = { ce: boolean; pe: boolean; stike: string };
/**
 * Type for order data.
 */
export type OrderData = {
  stikePrice: string;
  expiryDate: string;
  token: string;
  symbol: string;
  status: boolean;
  exchange: string;
};
/**
 * Enum for option type.
 */
export enum OptionType {
  CE = 'CE',
  PE = 'PE',
}
/**
 * Type for checking which position to close.
 */
export type checkPositionToCloseType = {
  openPositions: Position[];
};
/**
 * Enum for checking option type.
 */
export enum CheckOptionType {
  BOTH_CE_PE_PRESENT = 'both_present',
  ONLY_CE_PRESENT = 'ce_present',
  ONLY_PE_PRESENT = 'pe_present',
  BOTH_CE_PE_NOT_PRESENT = 'ce_pe_not_present',
}
/**
 * Type for running ORB strategy.
 */
export type runOrbType = {
  scriptName: string;
  price: number;
  maxSl: number;
  tradeDirection: 'up' | 'down';
  trailSl: number;
};
/**
 * Type for updating max stop loss.
 */
export type updateMaxSlType = { mtm: number; maxSl: number; trailSl: number };
/**
 * Enum for indices.
 */
export enum INDICES {
  NIFTY = 'NIFTY',
  MIDCPNIFTY = 'MIDCPNIFTY',
  FINNIFTY = 'FINNIFTY',
  BANKNIFTY = 'BANKNIFTY',
  SENSEX = 'SENSEX',
}
/**
 * Type for checking both legs of a trade.
 */
export type checkBothLegsType = {
  cepe_present: CheckOptionType;
  atmStrike: number;
};
/**
 * Type for getting the nearest strike.
 */
export type GetNearestStrike = {
  algoTrades: Position[];
  atmStrike: number;
};
/**
 * Type for getting current time and past time.
 */
export type GetCurrentTimeAndPastTimeType = {
  currentTime: string;
  pastTime: string;
};
/**
 * Interface for data record.
 */
export interface DataRecord {
  mtm: number;
  tradeDate: string;
  ordersExecuted: number;
  brokerageWithTax: number;
  indices: string;
}
/**
 * Type for order book response.
 */
export type OrderBookResponseType = {
  variety: string;
  ordertype: string;
  producttype: string;
  duration: string;
  price: string;
  triggerprice: string;
  quantity: string;
  disclosedquantity: string;
  squareoff: string;
  stoploss: string;
  trailingstoploss: string;
  tradingsymbol: string;
  transactiontype: string;
  exchange: string;
  symboltoken: string;
  instrumenttype: string;
  strikeprice: string;
  optiontype: string;
  expirydate: string;
  lotsize: string;
  cancelsize: string;
  averageprice: string;
  filledshares: string;
  unfilledshares: string;
  orderid: number;
  text: string;
  status: string;
  orderstatus: string;
  updatetime: string;
  exchtime: string;
  exchorderupdatetime: string;
  fillid: string;
  filltime: string;
  parentorderid: string;
  uniqueorderid: string;
};
