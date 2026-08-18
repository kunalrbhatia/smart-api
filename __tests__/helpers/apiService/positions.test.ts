/* eslint-disable @typescript-eslint/no-explicit-any */
import * as sessionHelper from '../../../src/helpers/apiService/session';
import * as marketDataHelper from '../../../src/helpers/apiService/marketData';
import * as ordersHelper from '../../../src/helpers/apiService/orders';

// Mock fs
jest.mock('fs');
import fs from 'fs';

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
  getAlgoPositions,
  saveAlgoPositions,
  updateLivePositions,
} from '../../../src/helpers/apiService/positions';
import { getCredentials } from 'krb-smart-api-module';
import OrderStore from '../../../src/store/orderStore';
import { logger } from '../../../src/helpers/logger';
import { notify } from '../../../src/helpers/notifier';

describe('ApiService - Positions - Final', () => {
  let mockOrderStoreInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('.paper-trade')) {
        return false;
      }
      return true;
    });
    (fs.readFileSync as jest.Mock).mockReturnValue('[]');
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

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
    (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
      ltp: 10,
    });
  });

  const mockFetchSuccess = (data: any) => {
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('.paper-trade')) {
        return false;
      }
      return true;
    });
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(data));
  };

  describe('getPositions', () => {
    it('should fetch and return positions', async () => {
      mockFetchSuccess([
        {
          tradingsymbol: 'T1',
          exchange: 'NFO',
          symboltoken: '1',
          netqty: '50',
          totalbuyvalue: '500',
          totalsellvalue: '0',
          realised: '0',
        },
      ]);
      const result = await getPositions(
        { jwtToken: 'token' } as any,
        {} as any,
      );

      expect(result).toHaveLength(1);
      expect(result[0].tradingsymbol).toBe('T1');
    });

    it('should log error and return empty if file reading fails', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read Error');
      });
      const result = await getPositions(
        { jwtToken: 'token' } as any,
        {} as any,
      );
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
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
          exchange: 'NFO',
          symboltoken: '1',
          totalbuyvalue: '0',
          totalsellvalue: '500',
          realised: '0',
        },
      ];
      mockFetchSuccess(allPositions);
      const result = await getPositionsJson();
      expect(result).toHaveLength(1);
    });

    it('should return empty array and log on failure', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Fatal');
      });
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
          exchange: 'NFO',
          totalbuyvalue: '0',
          totalsellvalue: '500',
          realised: '0',
        },
      ];

      let readCount = 0;
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        readCount++;
        if (readCount === 1 || readCount === 2) {
          return JSON.stringify(positions);
        }
        return JSON.stringify([]);
      });

      (ordersHelper.doOrder as jest.Mock).mockResolvedValue({ status: true });

      await closeTrade();

      expect(ordersHelper.doOrder).toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('Final MTM'));
    });
  });

  describe('getMtm', () => {
    it('should calculate MTM when positions.json contains symbol', async () => {
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 16,
      });
        if (
          typeof filePath === 'string' &&
          filePath.includes('positions.json')
        ) {
          return JSON.stringify([
            {
              tradingsymbol: 'T1',
              expirydate: '20FEB2025',
              symbolname: 'NIFTY',
            },
          ]);
        }
        return '[]';
      });
      const positions = [
        {
          tradingsymbol: 'T1',
          netqty: '50',
          unrealised: '300',
          realised: '200',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
          exchange: 'NFO',
          symboltoken: '1',
          totalbuyvalue: '500',
          totalsellvalue: '0',
        },
      ];
      expect(await getMtm(positions as any)).toBe(500);
    });

    it('should exclude foreign positions not present in positions.json', async () => {
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 16,
      });
        if (
          typeof filePath === 'string' &&
          filePath.includes('positions.json')
        ) {
          return JSON.stringify([
            {
              tradingsymbol: 'T1',
              expirydate: '20FEB2025',
              symbolname: 'NIFTY',
            },
          ]);
        }
        return '[]';
      });
      const positions = [
        {
          tradingsymbol: 'T1',
          netqty: '50',
          unrealised: '300',
          realised: '200',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
          exchange: 'NFO',
          symboltoken: '1',
          totalbuyvalue: '500',
          totalsellvalue: '0',
        },
        {
          tradingsymbol: 'NIFTY18AUG2623900PE',
          netqty: '-130',
          unrealised: '1000',
          realised: '500',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
          exchange: 'NFO',
          symboltoken: '2',
          totalbuyvalue: '0',
          totalsellvalue: '1000',
        },
      ];
      const mtm = await getMtm(positions as any);
      expect(mtm).toBe(500);
      expect(logger.log).toHaveBeenCalledWith(
        'Excluding foreign position from MTM: NIFTY18AUG2623900PE',
      );
    });

    it('should log warning and fallback to expiry+index filter if positions.json is empty', async () => {
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 16,
      });
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (
          typeof filePath === 'string' &&
          filePath.includes('positions.json')
        ) {
          return '[]';
        }
        return '[]';
      });
      const positions = [
        {
          tradingsymbol: 'T1',
          netqty: '50',
          unrealised: '300',
          realised: '200',
          expirydate: '20FEB2025',
          symbolname: 'NIFTY',
          exchange: 'NFO',
          symboltoken: '1',
          totalbuyvalue: '500',
          totalsellvalue: '0',
        },
      ];
      const mtm = await getMtm(positions as any);
      expect(mtm).toBe(500);
      expect(logger.warn).toHaveBeenCalledWith(
        '⚠️ positions.json empty — MTM may be incomplete',
      );
    });

    it('should return 0 if MTM fails', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('MTM Error');
      });
      const result = await getMtm();
      expect(result).toBe(0);
    });
  });

  describe('fetchOpenPositionsByExpiry', () => {
    it('should return empty if allPositions is not array or empty', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('null');
      const result = await fetchOpenPositionsByExpiry('NIFTY', '20FEB2025');
      expect(result).toEqual([]);
    });

    it('should return filtered positions', async () => {
      const positions = [
        {
          tradingsymbol: 'T1',
          exchange: 'NFO',
          symboltoken: '1',
          netqty: '50',
          totalbuyvalue: '500',
          totalsellvalue: '0',
          realised: '0',
        },
      ];
      mockFetchSuccess(positions);
      const result = await fetchOpenPositionsByExpiry('NIFTY', '20FEB2025');
      expect(result).toEqual([
        {
          ...positions[0],
          ltp: '10',
          unrealised: '0.00',
          pnl: '0.00',
        },
      ]);
    });

    it('should return empty on catch', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Fetch Error');
      });
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
          exchange: 'NFO',
          totalbuyvalue: '500',
          totalsellvalue: '0',
          realised: '0',
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
          totalbuyvalue: '0',
          totalsellvalue: '500',
          realised: '0',
        },
      ];
      mockFetchSuccess(positions);
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 4,
      });

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
          exchange: 'NFO',
          totalbuyvalue: '0',
          totalsellvalue: '500',
          realised: '0',
        },
      ];
      mockFetchSuccess(positions);
      (ordersHelper.doOrder as jest.Mock).mockResolvedValue({ status: true });
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 10,
      });

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

  describe('getAlgoPositions', () => {
    it('should load positions from positions.json in live mode', () => {
      const positions = [{ tradingsymbol: 'T1' }];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(positions));

      const result = getAlgoPositions();
      expect(result).toEqual(positions);
    });

    it('should return empty array if positions.json does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(getAlgoPositions()).toEqual([]);
    });

    it('should return empty array on read error', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read Error');
      });
      expect(getAlgoPositions()).toEqual([]);
    });
  });

  describe('saveAlgoPositions', () => {
    it('should write to positions.json', () => {
      const positions = [{ tradingsymbol: 'T1' }] as any;
      saveAlgoPositions(positions);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should log error on write failure', () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write Error');
      });
      saveAlgoPositions([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateLivePositions', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('[]');
    });

    it('should add a new position if it does not exist', async () => {
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 100,
      });

      await updateLivePositions({
        symboltoken: '12345',
        tradingsymbol: 'NIFTY20FEB2518000CE',
        transactionType: 'SELL',
        quantity: 50,
        exchange: 'NFO',
      });

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1],
      );
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].symboltoken).toBe('12345');
      expect(writtenData[0].netqty).toBe('-50');
    });

    it('should update existing position netqty and average price', async () => {
      const existing = [
        {
          symboltoken: '12345',
          tradingsymbol: 'NIFTY20FEB2518000CE',
          netqty: '-50',
          buyqty: '0',
          sellqty: '50',
          totalbuyvalue: '0',
          totalsellvalue: '5000',
          buyavgprice: '0',
          sellavgprice: '100',
          netvalue: '-5000',
          realised: '0',
          unrealised: '0',
          exchange: 'NFO',
          producttype: 'CARRYFORWARD',
          cfbuyavgprice: '0',
          cfsellavgprice: '0',
        },
      ];
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(existing));
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 110,
      });

      await updateLivePositions({
        symboltoken: '12345',
        tradingsymbol: 'NIFTY20FEB2518000CE',
        transactionType: 'BUY',
        quantity: 50,
        exchange: 'NFO',
      });

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1],
      );
      expect(writtenData[0].netqty).toBe('0');
      expect(writtenData[0].realised).toBe('-500');
    });

    it('should handle covering long position (selling a long)', async () => {
      const existing = [
        {
          symboltoken: '12345',
          tradingsymbol: 'NIFTY20FEB2518000CE',
          netqty: '50',
          buyqty: '50',
          sellqty: '0',
          totalbuyvalue: '5000',
          totalsellvalue: '0',
          buyavgprice: '100',
          sellavgprice: '0',
          netvalue: '5000',
          realised: '0',
          unrealised: '0',
          exchange: 'NFO',
          producttype: 'CARRYFORWARD',
          cfbuyavgprice: '0',
          cfsellavgprice: '0',
        },
      ];
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(existing));
      (marketDataHelper.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 110,
      });

      await updateLivePositions({
        symboltoken: '12345',
        tradingsymbol: 'NIFTY20FEB2518000CE',
        transactionType: 'SELL',
        quantity: 50,
        exchange: 'NFO',
      });

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1],
      );
      expect(writtenData[0].netqty).toBe('0');
      expect(writtenData[0].realised).toBe('500');
    });
  });
});
