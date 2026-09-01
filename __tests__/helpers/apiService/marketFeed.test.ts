const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockFetchData = jest.fn();
const mockClose = jest.fn();
let capturedTickCb: ((data: any) => void) | null = null;

const mockWebSocketV2Instance: {
  connect: any;
  fetchData: any;
  close: any;
  on: any;
  customError?: any;
} = {
  connect: mockConnect,
  fetchData: mockFetchData,
  close: mockClose,
  on: jest.fn((event: string, cb: any) => {
    if (event === 'tick') {
      capturedTickCb = cb;
    }
  }),
};

jest.mock('smartapi-javascript', () => {
  return {
    WebSocketV2: jest.fn().mockImplementation(() => mockWebSocketV2Instance),
  };
});

import {
  normalizeToken,
  connectMarketFeed,
  disconnectMarketFeed,
  addMarketTickListener,
  removeMarketTickListener,
  isMarketFeedConnected,
} from '../../../src/helpers/apiService/marketFeed';
import * as positionsModule from '../../../src/helpers/apiService/positions';
import OrderStore from '../../../src/store/orderStore';

jest.mock('../../../src/helpers/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    mtm: jest.fn(),
  },
}));

jest.mock('../../../src/helpers/apiService/session', () => ({
  getSmartSession: jest.fn().mockResolvedValue({
    jwtToken: 'mock_jwt',
    refreshToken: 'mock_refresh',
    feedToken: 'mock_feed',
  }),
}));

import DataStore from '../../../src/store/dataStore';
import SmartSession from '../../../src/store/smartSession';

describe('marketFeed & normalizeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedTickCb = null;
    mockConnect.mockResolvedValue(undefined);
    DataStore.getInstance().setPostData({
      APIKEY: 'mock_api_key',
      CLIENT_CODE: 'mock_client_code',
      CLIENT_PIN: '1234',
      CLIENT_TOTP_PIN: '123456',
    });
    SmartSession.getInstance().setPostData({
      jwtToken: 'mock_jwt',
      refreshToken: 'mock_refresh',
      feedToken: 'mock_feed',
    });
    disconnectMarketFeed();
  });

  describe('normalizeToken', () => {
    it('normalizes various token representations correctly', () => {
      expect(normalizeToken('41000')).toBe('41000');
      expect(normalizeToken(41000)).toBe('41000');
      expect(normalizeToken('41000\u0000')).toBe('41000');
      expect(normalizeToken('000041000')).toBe('41000');
      expect(normalizeToken(undefined)).toBe('');
      expect(normalizeToken(null)).toBe('');
      expect(normalizeToken('000')).toBe('0');
      expect(normalizeToken('abc')).toBe('');
    });
  });

  describe('connectMarketFeed & ticks', () => {
    it('connects WebSocketV2 and subscribes to given token specs', async () => {
      const specs = [
        { token: '99926000', exchangeType: 1 },
        { token: '41000', exchangeType: 2 },
      ];

      await connectMarketFeed(specs);

      expect(mockConnect).toHaveBeenCalled();
      expect(isMarketFeedConnected()).toBe(true);
      expect(mockFetchData).toHaveBeenCalledWith({
        correlationID: expect.stringMatching(/^sub_1_/),
        action: 1,
        mode: 1,
        exchangeType: 1,
        tokens: ['99926000'],
      });
      expect(mockFetchData).toHaveBeenCalledWith({
        correlationID: expect.stringMatching(/^sub_2_/),
        action: 1,
        mode: 1,
        exchangeType: 2,
        tokens: ['41000'],
      });
    });

    it('processes tick events and scales LTP by dividing by 100', async () => {
      const listener = jest.fn();
      addMarketTickListener(listener);

      await connectMarketFeed([{ token: '41000', exchangeType: 2 }]);

      expect(capturedTickCb).not.toBeNull();
      if (capturedTickCb) {
        capturedTickCb({
          token: '000041000\u0000',
          last_traded_price: '12345',
        });
      }

      expect(listener).toHaveBeenCalledWith({
        token: '41000',
        ltp: 123.45,
      });

      removeMarketTickListener(listener);
    });

    it('handles disconnectMarketFeed and market feed callbacks correctly', async () => {
      await connectMarketFeed([{ token: '41000', exchangeType: 2 }]);
      expect(isMarketFeedConnected()).toBe(true);

      disconnectMarketFeed();
      expect(isMarketFeedConnected()).toBe(false);
    });

    it('invokes wsClient.customError if available on wsClient', async () => {
      const mockCustomError = jest.fn();
      mockWebSocketV2Instance.customError = mockCustomError;

      await connectMarketFeed([{ token: '41000', exchangeType: 2 }]);
      expect(mockCustomError).toHaveBeenCalled();

      delete mockWebSocketV2Instance.customError;
    });

    it('handles tick property fallbacks and invalid tick structures', async () => {
      const listener = jest.fn();
      addMarketTickListener(listener);

      await connectMarketFeed([{ token: '41000', exchangeType: 2 }]);

      if (capturedTickCb) {
        // null data
        capturedTickCb(null);
        // data.symboltoken fallback + data.ltp fallback
        capturedTickCb({
          symboltoken: '41000',
          ltp: '5000',
        });
        // data.lastTradedPrice fallback
        capturedTickCb({
          token: '41000',
          lastTradedPrice: '6000',
        });
        // invalid non-numeric price
        capturedTickCb({
          token: '41000',
          ltp: 'invalid',
        });
        // missing/invalid token
        capturedTickCb({
          token: 'abc',
          ltp: '1000',
        });
      }

      expect(listener).toHaveBeenCalledWith({ token: '41000', ltp: 50 });
      expect(listener).toHaveBeenCalledWith({ token: '41000', ltp: 60 });
      removeMarketTickListener(listener);
    });
  });

  describe('getMtm fast path with latestPrices map', () => {
    it('uses latestPrices map without throwing or failing', async () => {
      const positions: any[] = [
        {
          symboltoken: '41000',
          tradingsymbol: 'NIFTY26AUG24200CE',
          expirydate: '26AUG2026',
          symbolname: 'NIFTY',
          netqty: '-25',
          netvalue: '-3000',
          totalbuyvalue: '0',
          totalsellvalue: '3000',
          realised: '0',
          unrealised: '0',
          ltp: '120.00',
        },
      ];

      const latestPrices = new Map<string, number>([['41000', 140]]);

      jest
        .spyOn(positionsModule, 'getAlgoPositions')
        .mockReturnValue(positions);

      jest
        .spyOn(OrderStore.getInstance(), 'getPostData')
        .mockReturnValue({ EXPIRYDATE: '26AUG2026', INDEX: 'NIFTY' } as any);

      const mtm = await positionsModule.getMtm(positions, latestPrices);
      expect(mtm).toBe(-500);
    });
  });

  describe('connectMarketFeed retry and reconnect branches', () => {
    it('handles connection error gracefully', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(
        connectMarketFeed([{ token: '41000', exchangeType: 2 }]),
      ).resolves.not.toThrow();
      expect(isMarketFeedConnected()).toBe(false);
    });
  });
});
