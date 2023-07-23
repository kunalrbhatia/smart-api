export interface ISmartApiData {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}
export interface JsonFileStructure {
  isTradeExecuted: boolean;
  accountDetails: {
    capitalUsed: number;
  };
  tradeDetails: [
    {
      call: { strike: string; token: string; mtm: number };
      put: { strike: string; token: string; mtm: number };
      mtmTotal: number;
    }
  ];
}
