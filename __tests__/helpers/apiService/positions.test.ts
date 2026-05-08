/* eslint-disable @typescript-eslint/no-explicit-any */
import * as sessionHelper from '../../../src/helpers/apiService/session';

import * as marketDataHelper from '../../../src/helpers/apiService/marketData';
import * as ordersHelper from '../../../src/helpers/apiService/orders';

// Mock krb-smart-api-module FIRST
jest.mock('krb-smart-api-module', () => ({
  __esModule: true,
  delay: jest.fn().mockResolvedValue(undefined),
  getCredentials: jest
    .fn()
    .mockReturnValue({ clientCode: 'C1', password: 'P1' }),
  isCurrentTimeGreater: jest.fn(),
  isTradingHoliday: jest.fn(),
  getNearestStrike: jest.fn(),
  DELAY: 10,
}));

// Mock other dependencies
jest.mock('../../../src/helpers/api');
jest.mock('../../../src/helpers/logger');
jest.mock('../../../src/helpers/notifier');
jest.mock('../../../src/store/orderStore');
jest.mock('../../../src/helpers/apiService/session');
jest.mock('../../../src/helpers/apiService/marketData');
jest.mock('../../../src/helpers/apiService/orders');
jest.mock('../../../src/helpers/functions');

import * as functionsHelper from '../../../src/helpers/functions';

import {
  getPositions,
  getPositionsJson,
  getMtm,
  closeTrade,
  fetchOpenPositionsByExpiry,
  closeAllTrades,
} from '../../../src/helpers/apiService/positions';
import { getCredentials } from 'krb-smart-api-module';
import OrderStore from '../../../src/store/orderStore';
import { logger } from '../../../src/helpers/logger';
import { notify } from '../../../src/helpers/notifier';

describe('ApiService - Positions - Final', () => {
  let mockOrderStoreInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderStoreInstance = {
      getPostData: jest
        .fn()
        .mockReturnValue({ INDEX: 'NIFTY', EXPIRYDATE: '20FEB2025' }),
    };
    (OrderStore.getInstance as jest.Mock).mockReturnValue(
      mockOrderStoreInstance,
    );
    (functionsHelper.getOpenSellPositions as jest.Mock).mockImplementation(
      p => p,
    );
    (functionsHelper.getAllOpenPositions as jest.Mock).mockImplementation(
      p => p,
    );
    (functionsHelper.getOpenPositionsByExpiry as jest.Mock).mockImplementation(
      p => p,
    );

    (sessionHelper.getAuthHeaders as jest.Mock).mockResolvedValue({
      Authorization: 'Bearer token',
    });
    (sessionHelper.getSmartSession as jest.Mock).mockResolvedValue({
      jwtToken: 'token',
    });
    (getCredentials as jest.Mock).mockReturnValue({
      clientCode: 'C1',
      password: 'P1',
    });
    global.fetch = jest.fn() as any;
  });

  const mockFetchSuccess = (data: any) => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({ data, status: true }),
    });
  };

  describe('getPositions', () => {
    it('should fetch and return positions', async () => {
      mockFetchSuccess([{ tradingsymbol: 'T1' }]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getPositions(
        { jwtToken: 'token' } as any,
        {} as any,
      );

      expect(result).toEqual([{ tradingsymbol: 'T1' }]);
    });

    it('should throw error if API returns error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 400,
        json: jest.fn().mockResolvedValue({ message: 'Error', status: false }),
      });
      await expect(
        getPositions({ jwtToken: 'token' } as any, {} as any, 1),
      ).rejects.toThrow('getPositions');
    });
  });

  describe('getPositionsJson', () => {
    it('should filter for open positions', async () => {
      const allPositions = [
        {
          tradingsymbol: 'NIFTY20FEB2518000CE',
          netqty: '-50',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
        },
      ];
      mockFetchSuccess(allPositions);
      const result = await getPositionsJson();
      expect(result).toHaveLength(1);
    });

    it('should return empty array and log on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fatal'));
      const result = await getPositionsJson();
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('closeTrade', () => {
    it('should close open sell positions and stop after success', async () => {
      const positions = [
        {
          tradingsymbol: 'T2',
          netqty: '-50',
          symboltoken: '2',
          lotsize: '50',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
        },
      ];
      // Mock fetch: 1st call (closeTrade while), 2nd call (closeAllTrades), 3rd call (closeTrade while loop check - returns empty)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 200,
          json: jest.fn().mockResolvedValue({ data: positions, status: true }),
        })
        .mockResolvedValueOnce({
          status: 200,
          json: jest.fn().mockResolvedValue({ data: positions, status: true }),
        })
        .mockResolvedValue({
          status: 200,
          json: jest.fn().mockResolvedValue({ data: [], status: true }),
        });

      (ordersHelper.doOrder as jest.Mock).mockResolvedValue({ status: true });
      (marketDataHelper.getLtpData as jest.Mock).mockResolvedValue({ ltp: 10 });

      await closeTrade();

      expect(ordersHelper.doOrder).toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('Final MTM'));
    });
  });

  describe('getMtm', () => {
    it('should calculate MTM', async () => {
      const positions = [
        {
          tradingsymbol: 'T1',
          netqty: '50',
          unrealised: '300',
          realised: '200',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
        },
      ];
      mockFetchSuccess(positions);
      expect(await getMtm()).toBe(500);
    });

    it('should rethrow if MTM fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('MTM Error'));
      await expect(getMtm()).rejects.toThrow('MTM Error');
    });
  });

  describe('fetchOpenPositionsByExpiry', () => {
    it('should return empty if allPositions is not array', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({ data: null, status: true }),
      });
      const result = await fetchOpenPositionsByExpiry('NIFTY', '20FEB2025');
      expect(result).toEqual([]);
    });

    it('should return filtered positions', async () => {
      const positions = [{ tradingsymbol: 'T1' }];
      mockFetchSuccess(positions);
      const result = await fetchOpenPositionsByExpiry('NIFTY', '20FEB2025');
      expect(result).toEqual(positions);
    });

    it('should return empty on catch', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch Error'));
      const result = await fetchOpenPositionsByExpiry('NIFTY', '20FEB2025');
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('closeTrade and closeAllTrades branches', () => {
    it('should handle isAbrupt path in closeAllTrades', async () => {
      const positions = [
        {
          tradingsymbol: 'T1',
          netqty: '50',
          symboltoken: '1',
          lotsize: '50',
        },
      ];
      mockFetchSuccess(positions);
      (ordersHelper.doOrder as jest.Mock).mockResolvedValue({ status: true });

      await closeAllTrades(true);
      expect(ordersHelper.doOrder).toHaveBeenCalled();
    });

    it('should NOT close if ltp is less than or equal to 5', async () => {
      const positions = [
        {
          tradingsymbol: 'T1',
          netqty: '-50',
          symboltoken: '1',
          lotsize: '50',
          exchange: 'NFO',
        },
      ];
      mockFetchSuccess(positions);
      (marketDataHelper.getLtpData as jest.Mock).mockResolvedValue({ ltp: 4 });

      await closeAllTrades(false);
      expect(ordersHelper.doOrder).not.toHaveBeenCalled();
    });

    it('should notify and error when max retries reached in closeTrade', async () => {
      const positions = [
        {
          tradingsymbol: 'T1',
          netqty: '-50',
          symboltoken: '1',
          lotsize: '50',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
        },
      ];
      // Always return active positions to keep loop going
      mockFetchSuccess(positions);
      (ordersHelper.doOrder as jest.Mock).mockResolvedValue({ status: true });
      (marketDataHelper.getLtpData as jest.Mock).mockResolvedValue({ ltp: 10 });

      await closeTrade();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to close all positions after 5 attempts',
        ),
      );
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'));
    });
  });

  describe('checkPositionAlreadyExists', () => {
    it('should return true if match found', async () => {
      const { checkPositionAlreadyExists } = await import(
        '../../../src/helpers/apiService/positions'
      );
      const result = await checkPositionAlreadyExists({
        position: { strikeprice: '18000', optiontype: 'CE' } as any,
        trades: [{ strike: '18000', optionType: 'CE' }] as any,
      });
      expect(result).toBe(true);
    });

    it('should return false if no match', async () => {
      const { checkPositionAlreadyExists } = await import(
        '../../../src/helpers/apiService/positions'
      );
      const result = await checkPositionAlreadyExists({
        position: { strikeprice: '18000', optiontype: 'CE' } as any,
        trades: [{ strike: '18500', optionType: 'CE' }] as any,
      });
      expect(result).toBe(false);
    });
  });
});
