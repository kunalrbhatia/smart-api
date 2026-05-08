/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'smartapi-javascript' {
  export class SmartAPI {
    constructor(config: { api_key: string; totp?: string });
    generateSession(
      client_code: string,
      client_pin: string,
      totp: string,
    ): Promise<any>;
    generateToken(refreshToken: string): Promise<any>;
    getProfile(): Promise<any>;
    logout(): Promise<any>;
    getRMS(): Promise<any>;
    getHolding(): Promise<any>;
    getPosition(): Promise<any>;
    getOrderBook(): Promise<any>;
    getTradeBook(): Promise<any>;
    placeOrder(params: any): Promise<any>;
    modifyOrder(params: any): Promise<any>;
    cancelOrder(params: any): Promise<any>;
    getLTP(params: any): Promise<any>;
    getHistoricalData(params: any): Promise<any>;
  }
  export class WebSocket {
    constructor(config: any);
    connect(): Promise<any>;
    on(event: string, callback: any): void;
    subscribe(params: any): void;
  }
}

declare module 'totp-generator' {
  function totp(secret: string, options?: any): string;
  export default totp;
}

declare module 'public-ip' {
  export function v4(): Promise<string>;
  export function v6(): Promise<string>;
}

declare module 'krb-smart-api-module' {
  export function delay(ms: number | { milliSeconds: number }): Promise<void>;
  export function getCredentials(): any;
  export function setCredentials(credentials: any): void;
  export function isCurrentTimeGreater(
    time: string | { hours: number; minutes: number },
  ): boolean;
  export function isTradingHoliday(): boolean;
  export function getNearestStrike(
    params:
      | number
      | { algoTrades: any[]; atmStrike: number; expirationDate: string },
  ): number;
  export function getLastThursdayOfCurrentMonth(): string;
  export const DELAY: number;
  export const INDICES: any;
  export const CREDENTIALS: any;
  export type CREDENTIALS = any;
}
