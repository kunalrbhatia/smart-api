export interface ISmartApiData {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}
export interface TradeDetails {
  call: { strike: string; token: string; symbol: string; closed: boolean };
  put: { strike: string; token: string; symbol: string; closed: boolean };
}
export interface JsonFileStructure {
  isTradeExecuted: boolean;
  accountDetails: {
    capitalUsed: number;
  };
  tradeDetails: TradeDetails[];
  isTradeClosed: boolean;
}
