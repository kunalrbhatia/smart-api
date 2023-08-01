export interface ISmartApiData {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}
export interface TradeDetails {
  call?: {
    strike: string;
    token: string;
    symbol: string;
    closed: boolean;
    isAlgoCreatedPosition?: boolean;
  };
  put?: {
    strike: string;
    token: string;
    symbol: string;
    closed: boolean;
    isAlgoCreatedPosition?: boolean;
  };
}
export interface JsonFileStructure {
  isTradeExecuted: boolean;
  accountDetails: {
    capitalUsed: number;
  };
  tradeDetails: TradeDetails[];
  isTradeClosed: boolean;
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
  optiontype: string;
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
