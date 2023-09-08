export interface ISmartApiData {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}
export interface TradeDetails {
  netQty: string;
  optionType: 'CE' | 'PE';
  strike: string;
  token: string;
  symbol: string;
  closed: boolean;
  expireDate: string;
  isAlgoCreatedPosition?: boolean;
  isPositional?: boolean;
  tradedPrice?: number;
  tradingSymbol?: string;
  exchange?: string;
}
export interface MtmValue {
  time: string;
  value: string;
}
export enum TradeType {
  POSITIONAL = 'positional',
  INTRADAY = 'intraday',
}

export interface JsonFileStructure {
  isTradeExecuted: boolean;
  accountDetails: {
    capitalUsed: number;
  };
  tradeDetails: TradeDetails[];
  isTradeClosed: boolean;
  mtm: MtmValue[];
}
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
export type Credentails = {
  APIKEY: string;
  CLIENT_CODE: string;
  CLIENT_PIN: string;
  CLIENT_TOTP_PIN: string;
};
export type CheckPosition = { position: Position; trades: TradeDetails[] };
export type getLtpDataType = {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
};
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
export type getScripType = {
  scriptName: string;
  strikePrice?: string;
  optionType?: 'CE' | 'PE';
  expiryDate: string;
};
export type doOrderType = {
  tradingsymbol: string;
  symboltoken: string;
  transactionType: string | undefined;
};
export type doOrderResponse = {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    script: string;
    orderid: string;
  };
};
export type getPositionByTokenType = {
  positions: Position[];
  token: string;
};
export type shouldCloseTradeType = {
  ltp: number;
  avg: number;
  trade: TradeDetails;
};
export type delayType = {
  milliSeconds: number | undefined | string;
};
export type TimeComparisonType = { hours: number; minutes: number };
export type bodyType = {
  api_key: string;
  client_code: string;
  client_pin: string;
  client_totp_pin: string;
};
export type reqType = { body: bodyType };
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
export type AddShortStraddleData = {
  data: JsonFileStructure;
  shortStraddleData: ShortStraddleData;
  tradeType: TradeType;
};
export type BothPresent = { ce: boolean; pe: boolean; stike: string };
export type OrderData = {
  stikePrice: string;
  expiryDate: string;
  netQty: string;
  token: string;
  symbol: string;
  status: boolean;
};
export enum OptionType {
  CE = 'CE',
  PE = 'PE',
}
export type checkPositionToCloseType = {
  openPositions: Position[];
  tradeType: TradeType;
};
export enum CheckOptionType {
  BOTH_CE_PE_PRESENT = 'both_present',
  ONLY_CE_PRESENT = 'ce_present',
  ONLY_PE_PRESENT = 'pe_present',
  BOTH_CE_PE_NOT_PRESENT = 'ce_pe_not_present',
}
