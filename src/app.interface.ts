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
  tradedPrice?: number;
  tradingSymbol?: string;
  exchange?: string;
}
export interface MtmValue {
  time: string;
  value: string;
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
