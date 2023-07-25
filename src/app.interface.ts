export interface ISmartApiData {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}
export interface TradeDetails {
  call: { strike: string; token: string; mtm: number; symbol: string };
  put: { strike: string; token: string; mtm: number; symbol: string };
  mtmTotal: number;
}
export interface JsonFileStructure {
  isTradeExecuted: boolean;
  accountDetails: {
    capitalUsed: number;
  };
  tradeDetails: TradeDetails[];
}
