import {
  doOrder,
  doOrderByStrike,
  getPendingOrders,
  hasStopLossOrderForPosition,
  placeStoplossForAllSells,
} from '../../../src/helpers/apiService/orders';
import * as api from '../../../src/helpers/api';
import { logger } from '../../../src/helpers/logger';
import { notify } from '../../../src/helpers/notifier';
import OrderStore from '../../../src/store/orderStore';
import * as sessionHelper from '../../../src/helpers/apiService/session';
import * as marketDataHelper from '../../../src/helpers/apiService/marketData';
import * as positionsHelper from '../../../src/helpers/apiService/positions';
import { OptionType } from '../../../src/app.interface';
import {
  PENDING_ORDER_STATUS,
  VARIETY_STOPLOSS,
} from '../../../src/helpers/constants';

// Mock dependencies
jest.mock('../../../src/helpers/api');
jest.mock('../../../src/helpers/logger');
jest.mock('../../../src/helpers/notifier');
jest.mock('../../../src/store/orderStore');
jest.mock('../../../src/helpers/apiService/session');
jest.mock('../../../src/helpers/apiService/marketData');
jest.mock('../../../src/helpers/apiService/positions');
jest.mock('krb-smart-api-module', () => ({
  ...jest.requireActual('krb-smart-api-module'),
  delay: jest.fn().mockResolvedValue(undefined),
  DELAY: 10,
}));

describe('ApiService - Orders', () => {
  let mockOrderStoreInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderStoreInstance = {
      getPostData: jest.fn().mockReturnValue({
        QUANTITY: 1,
        INDEX: 'NIFTY',
        EXPIRYDATE: '20FEB2025',
      }),
      setPostData: jest.fn(),
    };
    (OrderStore.getInstance as jest.Mock).mockReturnValue(
      mockOrderStoreInstance,
    );
    (sessionHelper.getAuthHeaders as jest.Mock).mockResolvedValue({
      Authorization: 'Bearer token',
    });
    (sessionHelper.getSmartSession as jest.Mock).mockResolvedValue({
      jwtToken: 'token',
    });
  });

  describe('doOrder', () => {
    it('should place an order with provided quantity', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        status: true,
        data: { orderid: '123' },
      });

      const result = await doOrder({
        tradingsymbol: 'NIFTY-CE',
        transactionType: 'BUY',
        symboltoken: '1',
        quantity: 50,
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(result.status).toBe(true);
      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ quantity: 50 }),
        expect.any(Object),
      );
    });

    it('should resolve exchange to BFO for SENSEX symbol when exchange is not provided', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'SENSEX2682077400CE',
        transactionType: 'BUY',
        symboltoken: '12345',
        lotSize: 10,
        quantity: 10,
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tradingsymbol: 'SENSEX2682077400CE',
          exchange: 'BFO',
        }),
        expect.any(Object),
      );
    });

    it('should resolve exchange to NFO for NIFTY symbol when exchange is not provided', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'NIFTY26AUG24200CE',
        transactionType: 'BUY',
        symboltoken: '12345',
        lotSize: 25,
        quantity: 25,
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tradingsymbol: 'NIFTY26AUG24200CE',
          exchange: 'NFO',
        }),
        expect.any(Object),
      );
    });

    it('should preserve explicit exchange when exchange is provided', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'SENSEX2682077400CE',
        transactionType: 'BUY',
        symboltoken: '12345',
        lotSize: 10,
        quantity: 10,
        exchange: 'CUSTOM_EXCH',
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tradingsymbol: 'SENSEX2682077400CE',
          exchange: 'CUSTOM_EXCH',
        }),
        expect.any(Object),
      );
    });

    it('should calculate quantity from lots and lotSize if quantity not provided', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'NIFTY-CE',
        transactionType: 'BUY',
        symboltoken: '1',
        lotSize: 50,
        lots: 2,
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ quantity: 100 }),
        expect.any(Object),
      );
    });

    it('should resolve exchange to BFO for SENSEX symbols when exchange is omitted', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'SENSEX2682077400CE',
        transactionType: 'SELL',
        symboltoken: '100',
        quantity: 10,
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          exchange: 'BFO',
          tradingsymbol: 'SENSEX2682077400CE',
        }),
        expect.any(Object),
      );
    });

    it('should resolve exchange to NFO for NIFTY symbols when exchange is omitted', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'NIFTY26AUG24200CE',
        transactionType: 'SELL',
        symboltoken: '101',
        quantity: 50,
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          exchange: 'NFO',
          tradingsymbol: 'NIFTY26AUG24200CE',
        }),
        expect.any(Object),
      );
    });

    it('should preserve explicitly provided exchange even for SENSEX/NIFTY', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'SENSEX2682077400CE',
        transactionType: 'SELL',
        symboltoken: '100',
        quantity: 10,
        exchange: 'CUSTOM_EXCH',
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ exchange: 'CUSTOM_EXCH' }),
        expect.any(Object),
      );
    });

    it('should use hedge quantity multiplier if isHedge is true', async () => {
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await doOrder({
        tradingsymbol: 'NIFTY-CE',
        transactionType: 'BUY',
        symboltoken: '1',
        lotSize: 50,
        lots: 1,
        isHedge: true,
        variety: 'NORMAL',
        ordertype: 'MARKET',
      });

      // hedge quantity = lots * 5 = 1 * 5 = 5. Qty = 5 * 50 = 250
      expect(api.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ quantity: 250 }),
        expect.any(Object),
      );
    });

    it('should throw error if neither quantity nor lotSize is provided', async () => {
      await expect(
        doOrder({
          tradingsymbol: 'NIFTY-CE',
          transactionType: 'BUY',
          symboltoken: '1',
          variety: 'NORMAL',
          ordertype: 'MARKET',
        } as any),
      ).rejects.toThrow('Either quantity or lotSize must be provided');
    });

    it('should log and throw error if API fails', async () => {
      (api.post as jest.Mock).mockRejectedValue(new Error('API Failure'));
      await expect(
        doOrder({
          tradingsymbol: 'T',
          transactionType: 'BUY',
          symboltoken: '1',
          quantity: 1,
          variety: 'NORMAL',
          ordertype: 'MARKET',
        }),
      ).rejects.toThrow('API Failure');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('doOrderByStrike', () => {
    it('should successfully place order by strike', async () => {
      (marketDataHelper.searchScrip as jest.Mock).mockResolvedValue('scrip');
      (marketDataHelper.getScrip as jest.Mock).mockResolvedValue([
        { symbol: 'NIFTY-CE', token: '1', lotsize: '50', exch_seg: 'NFO' },
      ]);
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 100,
      });
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      const result = await doOrderByStrike(18000, OptionType.CE, 'BUY');

      expect(result).toMatchObject({ status: true, symbol: 'NIFTY-CE' });
    });

    it('should skip hedge if LTP > 3', async () => {
      (marketDataHelper.searchScrip as jest.Mock).mockResolvedValue('scrip');
      (marketDataHelper.getScrip as jest.Mock).mockResolvedValue([
        { symbol: 'NIFTY-CE', token: '1', lotsize: '50' },
      ]);
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 5,
      });

      const result = await doOrderByStrike(18000, OptionType.CE, 'BUY', true);

      expect(result).toBe(false);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping hedge'),
      );
    });

    it('should throw error if searching or getting scrip fails', async () => {
      (marketDataHelper.searchScrip as jest.Mock).mockRejectedValue(
        new Error('Search failed'),
      );
      await expect(
        doOrderByStrike(18000, OptionType.CE, 'BUY'),
      ).rejects.toThrow('Search failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getPendingOrders', () => {
    it('should filter for pending stop loss orders', async () => {
      const orders = [
        {
          status: PENDING_ORDER_STATUS,
          variety: VARIETY_STOPLOSS,
          data: { id: 1 },
        },
        { status: 'COMPLETE', variety: 'NORMAL', data: { id: 2 } },
      ];
      (api.get as jest.Mock).mockResolvedValue({ data: orders });

      const result = await getPendingOrders();

      expect(result).toHaveLength(1);
    });

    it('should return empty array on failure', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('API Error'));
      const result = await getPendingOrders();
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('hasStopLossOrderForPosition', () => {
    it('should return true if matching order exists', () => {
      const position: any = {
        tradingsymbol: 'NIFTY-CE',
        optiontype: 'CE',
        strikeprice: '18000',
      };
      const pendingOrders = [
        { tradingsymbol: 'NIFTY-CE', optiontype: 'CE', strikeprice: '18000' },
      ];
      expect(hasStopLossOrderForPosition(position, pendingOrders as any)).toBe(
        true,
      );
    });
  });

  describe('placeStoplossForAllSells', () => {
    it('should place SL for all open sell positions for index/expiry', async () => {
      const sellPositions: any = [
        {
          tradingsymbol: 'S1',
          symboltoken: '1',
          netqty: '-50',
          cfsellavgprice: '100',
        },
      ];
      (
        positionsHelper.fetchOpenPositionsByExpiry as jest.Mock
      ).mockResolvedValue(sellPositions);
      (api.get as jest.Mock).mockResolvedValue({ data: [] }); // no pending orders
      (api.post as jest.Mock).mockResolvedValue({
        status: true,
        data: { orderid: 'ord1' },
      });

      const result = await placeStoplossForAllSells({
        index: 'NIFTY',
        expiry: '20FEB2025',
      });

      expect(result.sellPositionCount).toBe(1);
      expect(result.stoplossOrders[0].status).toBe(true);
    });

    it('should return if no sell positions found', async () => {
      (
        positionsHelper.fetchOpenPositionsByExpiry as jest.Mock
      ).mockResolvedValue([]);
      const result = await placeStoplossForAllSells({
        index: 'NIFTY',
        expiry: '20FEB2025',
      });
      expect(result.sellPositionCount).toBe(0);
    });

    it('should continue if fetching pending orders fails', async () => {
      const sellPositions: any = [
        {
          tradingsymbol: 'S1',
          symboltoken: '1',
          netqty: '-50',
          cfsellavgprice: '100',
        },
      ];
      (
        positionsHelper.fetchOpenPositionsByExpiry as jest.Mock
      ).mockResolvedValue(sellPositions);
      (api.get as jest.Mock).mockRejectedValue(
        new Error('Fetch pending failed'),
      );
      (api.post as jest.Mock).mockResolvedValue({ status: true });

      await placeStoplossForAllSells({ index: 'NIFTY', expiry: '20FEB2025' });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch pending orders'),
        expect.any(Error),
      );
      expect(api.post).toHaveBeenCalled(); // still called doOrder
    });

    it('should skip positions with invalid price', async () => {
      const sellPositions: any = [
        {
          tradingsymbol: 'S1',
          symboltoken: '1',
          netqty: '-50',
          cfsellavgprice: '0',
        },
      ];
      (
        positionsHelper.fetchOpenPositionsByExpiry as jest.Mock
      ).mockResolvedValue(sellPositions);
      (api.get as jest.Mock).mockResolvedValue({ data: [] });

      const result = await placeStoplossForAllSells({
        index: 'NIFTY',
        expiry: '20FEB2025',
      });
      expect(result.stoplossOrders[0].status).toBe('skipped');
    });

    it('should skip if stop loss already exists', async () => {
      const sellPositions: any = [
        {
          tradingsymbol: 'S1',
          symboltoken: '1',
          netqty: '-50',
          cfsellavgprice: '100',
        },
      ];
      (
        positionsHelper.fetchOpenPositionsByExpiry as jest.Mock
      ).mockResolvedValue(sellPositions);
      (api.get as jest.Mock).mockResolvedValue({
        data: [
          {
            status: PENDING_ORDER_STATUS,
            variety: VARIETY_STOPLOSS,
            tradingsymbol: 'S1',
            symboltoken: '1',
          },
        ],
      });

      const result = await placeStoplossForAllSells({
        index: 'NIFTY',
        expiry: '20FEB2025',
      });
      expect(result.stoplossOrders[0].reason).toBe('Already exists');
    });

    it('should handle failed individual order placements', async () => {
      const sellPositions: any = [
        {
          tradingsymbol: 'S1',
          symboltoken: '1',
          netqty: '-50',
          cfsellavgprice: '100',
        },
      ];
      (
        positionsHelper.fetchOpenPositionsByExpiry as jest.Mock
      ).mockResolvedValue(sellPositions);
      (api.get as jest.Mock).mockResolvedValue({ data: [] });
      (api.post as jest.Mock).mockRejectedValue(
        new Error('Individual order failed'),
      );

      const result = await placeStoplossForAllSells({
        index: 'NIFTY',
        expiry: '20FEB2025',
      });
      expect(result.stoplossOrders[0].status).toBe('failed');
    });
  });
});
