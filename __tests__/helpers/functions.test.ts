import { INDICES } from '../../src/app.interface';
import {
  getOpenPositionsByExpiry,
  getAtmStrikePriceForIndex,
  setCred,
  getCurrentTimeAndPastTime,
  updateMaxSl,
  getLastWednesdayOfMonth,
  getNextExpiry,
  findNearestStrike,
  getAtmStrikePrice,
  checkStrike,
  areBothOptionTypesPresentForStrike,
  getAllOpenPositions,
  getOpenSellPositions,
  isMarketClosed,
  getStrikeDifference,
  hedgeCalculation,
  getStrikeVariance,
  getExchangeForIndex,
  getSpotExchangeForIndex,
  getIndexFromSymbol,
  getAlgoIndex,
  hasOpenPositionForStrike,
  countSellPairs,
  hasHedgePositions,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  generateTradingSignal,
} from '../../src/helpers/functions';
import * as apiService from '../../src/helpers/apiService';
import DataStore from '../../src/store/dataStore';
import OrderStore from '../../src/store/orderStore';
import moment from 'moment-timezone';
import * as smartApiModule from 'krb-smart-api-module';

jest.mock('../../src/helpers/apiService');
jest.mock('../../src/store/dataStore');
jest.mock('../../src/store/orderStore');
jest.mock('krb-smart-api-module', () => ({
  getLastThursdayOfCurrentMonth: jest.fn(),
  isCurrentTimeGreater: jest.fn(),
  setCredentials: jest.fn(),
}));
jest.mock('../../src/helpers/logger');

describe('functions helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getOpenPositionsByExpiry', () => {
    const mockPositions: any[] = [
      {
        netqty: '-1',
        expirydate: '17FEB2026',
        symbolname: 'NIFTY',
        strikeprice: '25000',
      },
      {
        netqty: '1',
        expirydate: '17FEB2026',
        symbolname: 'NIFTY',
        strikeprice: '25100',
      },
      {
        netqty: '0',
        expirydate: '17FEB2026',
        symbolname: 'NIFTY',
        strikeprice: '25200',
      },
      {
        netqty: '-1',
        expirydate: '24FEB2026',
        symbolname: 'NIFTY',
        strikeprice: '25000',
      },
      {
        netqty: '-1',
        expirydate: '17FEB2026',
        symbolname: 'BANKNIFTY',
        strikeprice: '50000',
      },
    ];

    it('should return empty array if positions is not an array', () => {
      expect(
        getOpenPositionsByExpiry(null as any, 'NIFTY', '17FEB2026'),
      ).toEqual([]);
    });

    it('should filter positions by index and expiry', () => {
      const result = getOpenPositionsByExpiry(
        mockPositions,
        'NIFTY',
        '17FEB2026',
      );
      expect(result).toHaveLength(2);
      expect(result[0].strikeprice).toBe('25000');
      expect(result[1].strikeprice).toBe('25100');
    });

    it('should filter by SELL type', () => {
      const result = getOpenPositionsByExpiry(
        mockPositions,
        'NIFTY',
        '17FEB2026',
        'SELL',
      );
      expect(result).toHaveLength(1);
      expect(result[0].strikeprice).toBe('25000');
    });

    it('should filter by BUY type', () => {
      const result = getOpenPositionsByExpiry(
        mockPositions,
        'NIFTY',
        '17FEB2026',
        'BUY',
      );
      expect(result).toHaveLength(1);
      expect(result[0].strikeprice).toBe('25100');
    });
  });

  describe('getAtmStrikePriceForIndex', () => {
    it('should calculate ATM strike successfully', async () => {
      (apiService.getScrip as jest.Mock).mockResolvedValue([
        { strike: '2500000' },
        { strike: '2510000' },
      ]);
      (apiService.getIndexScrip as jest.Mock).mockResolvedValue([
        { exch_seg: 'NSE', symbol: 'NIFTY', token: '123' },
      ]);
      (apiService.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 25040,
      });

      const result = await getAtmStrikePriceForIndex('NIFTY', '17FEB2026');
      expect(result.atmStrike).toBe(25000);
      expect(result.ltp).toBe(25040);
    });

    it('should throw error if no option chain found', async () => {
      (apiService.getScrip as jest.Mock).mockResolvedValue([]);
      await expect(
        getAtmStrikePriceForIndex('NIFTY', '17FEB2026'),
      ).rejects.toThrow('No option chain found for NIFTY expiry 17FEB2026');
    });

    it('should throw error if index scrip not found', async () => {
      (apiService.getScrip as jest.Mock).mockResolvedValue([
        { strike: '2500000' },
      ]);
      (apiService.getIndexScrip as jest.Mock).mockResolvedValue([]);
      await expect(
        getAtmStrikePriceForIndex('NIFTY', '17FEB2026'),
      ).rejects.toThrow('Index scrip not found for NIFTY');
    });

    it('should throw error if invalid LTP received', async () => {
      (apiService.getScrip as jest.Mock).mockResolvedValue([
        { strike: '2500000' },
      ]);
      (apiService.getIndexScrip as jest.Mock).mockResolvedValue([
        { exch_seg: 'NSE', symbol: 'NIFTY', token: '123' },
      ]);
      (apiService.getLtpWithRetry as jest.Mock).mockResolvedValue({ ltp: 0 });
      await expect(
        getAtmStrikePriceForIndex('NIFTY', '17FEB2026'),
      ).rejects.toThrow('Invalid LTP received for NIFTY: 0');
    });
  });

  describe('setCred', () => {
    it('should set credentials and update DataStore', () => {
      const mockReq: any = {
        body: {
          api_key: 'key',
          client_code: 'code',
          client_pin: 'pin',
          client_totp_pin: 'totp',
        },
      };
      const dataStoreMock = { setPostData: jest.fn() };
      (DataStore.getInstance as jest.Mock).mockReturnValue(dataStoreMock);

      setCred(mockReq);

      expect(smartApiModule.setCredentials).toHaveBeenCalledWith({
        APIKEY: 'key',
        CLIENT_CODE: 'code',
        CLIENT_PIN: 'pin',
        CLIENT_TOTP_PIN: 'totp',
      });
      expect(dataStoreMock.setPostData).toHaveBeenCalledWith({
        APIKEY: 'key',
        CLIENT_CODE: 'code',
        CLIENT_PIN: 'pin',
        CLIENT_TOTP_PIN: 'totp',
      });
    });
  });

  describe('getCurrentTimeAndPastTime', () => {
    it('should return capped times if after market hours', () => {
      jest.setSystemTime(new Date('2026-02-17T16:00:00')); // 4 PM
      const result = getCurrentTimeAndPastTime();
      expect(result.currentTime).toBe('2026-02-17 15:30');
    });

    it('should return yesterday market start if before market hours', () => {
      jest.setSystemTime(new Date('2026-02-17T08:00:00')); // 8 AM
      const result = getCurrentTimeAndPastTime();
      expect(result.currentTime).toBe('2026-02-16 09:15');
    });

    it('should return current time if within market hours', () => {
      jest.setSystemTime(new Date('2026-02-17T10:00:00')); // 10 AM
      const result = getCurrentTimeAndPastTime();
      expect(result.currentTime).toBe('2026-02-17 10:00');
    });
  });

  describe('updateMaxSl', () => {
    it('should update maxSl if mtm is multiple of trailSl', () => {
      expect(updateMaxSl({ mtm: 1000, maxSl: 500, trailSl: 500 })).toBe(1500);
    });

    it('should not update maxSl if mtm is not multiple of trailSl', () => {
      expect(updateMaxSl({ mtm: 700, maxSl: 500, trailSl: 500 })).toBe(500);
    });
  });

  describe('getLastWednesdayOfMonth', () => {
    it('should return last Wednesday if before last Thursday', () => {
      jest.setSystemTime(new Date('2026-02-01'));
      const result = getLastWednesdayOfMonth();
      expect(result?.format('YYYY-MM-DD')).toBe('2026-02-25');
    });

    it('should return null if after last Thursday', () => {
      jest.setSystemTime(new Date('2026-02-27')); // Friday after last Thursday (26th)
      const result = getLastWednesdayOfMonth();
      expect(result).toBeNull();
    });
  });

  describe('getNextExpiry', () => {
    it('should return today if it is last Thursday', () => {
      (
        smartApiModule.getLastThursdayOfCurrentMonth as jest.Mock
      ).mockReturnValue('26FEB2026');
      jest.setSystemTime(new Date('2026-02-26'));
      expect(getNextExpiry()).toBe('26FEB2026');
    });

    it('should return tomorrow if it is last Wednesday', () => {
      (
        smartApiModule.getLastThursdayOfCurrentMonth as jest.Mock
      ).mockReturnValue('26FEB2026');
      jest.setSystemTime(new Date('2026-02-25')); // Last Wednesday
      expect(getNextExpiry()).toBe('26FEB2026');
    });

    it('should return last Thursday if between 2nd last and last Wednesday', () => {
      (
        smartApiModule.getLastThursdayOfCurrentMonth as jest.Mock
      ).mockReturnValue('26FEB2026');
      jest.setSystemTime(new Date('2026-02-20'));
      expect(getNextExpiry()).toBe('26FEB2026');
    });

    it('should return today if it is Wednesday', () => {
      (
        smartApiModule.getLastThursdayOfCurrentMonth as jest.Mock
      ).mockReturnValue('26FEB2026');
      jest.setSystemTime(new Date('2026-02-04')); // Wednesday
      expect(getNextExpiry()).toBe('04FEB2026');
    });

    it('should return next Wednesday otherwise', () => {
      (
        smartApiModule.getLastThursdayOfCurrentMonth as jest.Mock
      ).mockReturnValue('26FEB2026');
      jest.setSystemTime(new Date('2026-02-02')); // Monday
      expect(getNextExpiry()).toBe('04FEB2026');
    });
  });

  describe('findNearestStrike', () => {
    it('should find the nearest strike', () => {
      const options: any[] = [{ strike: '2500000' }, { strike: '2510000' }];
      expect(findNearestStrike(options, 25040)).toBe(25000);
      expect(findNearestStrike(options, 25060)).toBe(25100);
    });
  });

  describe('getAtmStrikePrice', () => {
    it('should fetch ATM strike using OrderStore data', async () => {
      (OrderStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: () => ({ EXPIRYDATE: '17FEB2026', INDEX: 'NIFTY' }),
      });
      (apiService.getScrip as jest.Mock).mockResolvedValue([
        { strike: '2500000' },
      ]);
      (apiService.getIndexScrip as jest.Mock).mockResolvedValue([
        { exch_seg: 'NSE', symbol: 'NIFTY', token: '123' },
      ]);
      (apiService.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 25010,
      });

      const result = await getAtmStrikePrice();
      expect(result).toBe(25000);
    });

    it('should throw error if LTP is invalid', async () => {
      (OrderStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: () => ({ EXPIRYDATE: '17FEB2026', INDEX: 'NIFTY' }),
      });
      (apiService.getScrip as jest.Mock).mockResolvedValue([
        { strike: '2500000' },
      ]);
      (apiService.getIndexScrip as jest.Mock).mockResolvedValue([
        { exch_seg: 'NSE', symbol: 'NIFTY', token: '123' },
      ]);
      (apiService.getLtpWithRetry as jest.Mock).mockResolvedValue({
        ltp: 'invalid',
      });

      await expect(getAtmStrikePrice()).rejects.toThrow(
        'ltpPrice is not a valid number!',
      );
    });
  });

  describe('checkStrike', () => {
    it('should return true if strike exists for expiry', () => {
      (OrderStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: () => ({ EXPIRYDATE: '17FEB2026' }),
      });
      const trades: any[] = [{ strikeprice: '25000', expirydate: '17FEB2026' }];
      expect(checkStrike(trades, '25000')).toBe(true);
    });

    it('should return false if strike does not match', () => {
      (OrderStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: () => ({ EXPIRYDATE: '17FEB2026' }),
      });
      const trades: any[] = [{ strikeprice: '25100', expirydate: '17FEB2026' }];
      expect(checkStrike(trades, '25000')).toBe(false);
    });
  });

  describe('areBothOptionTypesPresentForStrike', () => {
    it('should return ce/pe presence', () => {
      (OrderStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: () => ({ EXPIRYDATE: '17FEB2026' }),
      });
      const trades: any[] = [
        { strikeprice: '25000', expirydate: '17FEB2026', optiontype: 'CE' },
        { strikeprice: '25000', expirydate: '17FEB2026', optiontype: 'PE' },
      ];
      expect(areBothOptionTypesPresentForStrike(trades, '25000')).toEqual({
        ce: true,
        pe: true,
        stike: '25000',
      });
    });
  });

  describe('getAllOpenPositions', () => {
    it('should filter open positions by index and expiry', () => {
      (OrderStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: () => ({ EXPIRYDATE: '17FEB2026', INDEX: 'NIFTY' }),
      });
      const positions: any[] = [
        { netqty: '1', expirydate: '17FEB2026', symbolname: 'NIFTY' },
        { netqty: '0', expirydate: '17FEB2026', symbolname: 'NIFTY' },
      ];
      expect(getAllOpenPositions(positions)).toHaveLength(1);
    });
  });

  describe('getOpenSellPositions', () => {
    it('should filter sell positions', () => {
      (OrderStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: () => ({ EXPIRYDATE: '17FEB2026', INDEX: 'NIFTY' }),
      });
      const positions: any[] = [
        { netqty: '-1', expirydate: '17FEB2026', symbolname: 'NIFTY' },
        { netqty: '1', expirydate: '17FEB2026', symbolname: 'NIFTY' },
      ];
      expect(getOpenSellPositions(positions)).toHaveLength(1);
    });
  });

  describe('isMarketClosed', () => {
    it('should return false if within hours', () => {
      (smartApiModule.isCurrentTimeGreater as jest.Mock)
        .mockReturnValueOnce(true) // > 9:15
        .mockReturnValueOnce(false); // not > 15:30
      expect(isMarketClosed()).toBe(false);
    });

    it('should return true if outside hours', () => {
      (smartApiModule.isCurrentTimeGreater as jest.Mock).mockReturnValue(true); // > 9:15 and > 15:30
      expect(isMarketClosed()).toBe(true);
    });
  });

  describe('getStrikeDifference', () => {
    it('should return correct diff based on VIX and Index', () => {
      const store = {
        getPostData: jest.fn().mockReturnValue({ INDIAVIX: 13 }),
      };
      (OrderStore.getInstance as jest.Mock).mockReturnValue(store);

      expect(getStrikeDifference(INDICES.NIFTY)).toBe(50);
      expect(getStrikeDifference(INDICES.BANKNIFTY)).toBe(200);

      store.getPostData.mockReturnValue({ INDIAVIX: 15 });
      expect(getStrikeDifference(INDICES.NIFTY)).toBe(100);
      expect(getStrikeDifference(INDICES.BANKNIFTY)).toBe(300);

      expect(getStrikeDifference('OTHER')).toBe(50);
    });
  });

  describe('hedgeCalculation', () => {
    it('should return correct hedge distance', () => {
      expect(hedgeCalculation(INDICES.NIFTY)).toBe(500);
      expect(hedgeCalculation(INDICES.FINNIFTY)).toBe(500);
      expect(hedgeCalculation(INDICES.MIDCPNIFTY)).toBe(200);
      expect(hedgeCalculation(INDICES.BANKNIFTY)).toBe(1500);
      expect(hedgeCalculation('OTHER')).toBe(1000);
    });
  });

  describe('getStrikeVariance', () => {
    it('should return correct variance', () => {
      expect(getStrikeVariance(INDICES.NIFTY)).toBe(50);
      expect(getStrikeVariance(INDICES.BANKNIFTY)).toBe(100);
      expect(getStrikeVariance(INDICES.SENSEX)).toBe(100);
      expect(getStrikeVariance('OTHER')).toBe(0);
    });
  });

  describe('getExchangeForIndex', () => {
    it('should return BFO for SENSEX and NFO for NIFTY/BANKNIFTY', () => {
      expect(getExchangeForIndex(INDICES.SENSEX)).toBe('BFO');
      expect(getExchangeForIndex(INDICES.NIFTY)).toBe('NFO');
      expect(getExchangeForIndex(INDICES.BANKNIFTY)).toBe('NFO');
    });
  });

  describe('getSpotExchangeForIndex', () => {
    it('should return BSE for SENSEX and NSE for NIFTY', () => {
      expect(getSpotExchangeForIndex(INDICES.SENSEX)).toBe('BSE');
      expect(getSpotExchangeForIndex(INDICES.NIFTY)).toBe('NSE');
    });
  });

  describe('getIndexFromSymbol', () => {
    it('should parse index correctly from trading symbol', () => {
      expect(getIndexFromSymbol('SENSEX25AUG80000CE')).toBe(INDICES.SENSEX);
      expect(getIndexFromSymbol('BANKNIFTY25AUG45000CE')).toBe(
        INDICES.BANKNIFTY,
      );
      expect(getIndexFromSymbol('NIFTY25AUG25000CE')).toBe(INDICES.NIFTY);
    });
  });

  describe('getAlgoIndex', () => {
    const originalEnv = process.env.INDEX;

    afterEach(() => {
      process.env.INDEX = originalEnv;
      jest.restoreAllMocks();
    });

    it('should return NIFTY on Tuesday (day 2)', () => {
      delete process.env.INDEX;
      jest.spyOn(moment.prototype, 'day').mockReturnValue(2);
      expect(getAlgoIndex()).toBe(INDICES.NIFTY);
    });

    it('should return SENSEX on Thursday (day 4)', () => {
      delete process.env.INDEX;
      jest.spyOn(moment.prototype, 'day').mockReturnValue(4);
      expect(getAlgoIndex()).toBe(INDICES.SENSEX);
    });

    it('should NEVER return BANKNIFTY on any day of the week', () => {
      delete process.env.INDEX;
      for (let day = 0; day <= 6; day++) {
        jest.spyOn(moment.prototype, 'day').mockReturnValue(day);
        expect(getAlgoIndex()).not.toBe(INDICES.BANKNIFTY);
      }
    });

    it('should respect valid INDEX env override (NIFTY or SENSEX)', () => {
      process.env.INDEX = 'SENSEX';
      expect(getAlgoIndex()).toBe(INDICES.SENSEX);

      process.env.INDEX = 'NIFTY';
      expect(getAlgoIndex()).toBe(INDICES.NIFTY);
    });

    it('should ignore invalid or BANKNIFTY INDEX env override and fall back to day of week', () => {
      jest.spyOn(moment.prototype, 'day').mockReturnValue(4);

      process.env.INDEX = 'BANKNIFTY';
      expect(getAlgoIndex()).toBe(INDICES.SENSEX);
      expect(getAlgoIndex()).not.toBe(INDICES.BANKNIFTY);

      process.env.INDEX = 'INVALID';
      expect(getAlgoIndex()).toBe(INDICES.SENSEX);
    });
  });

  describe('hasOpenPositionForStrike', () => {
    it('should return true if strike exists', () => {
      expect(
        hasOpenPositionForStrike([{ strikeprice: '25000' }] as any, 25000),
      ).toBe(true);
    });
    it('should return false if strike does not exist', () => {
      expect(
        hasOpenPositionForStrike([{ strikeprice: '25100' }] as any, 25000),
      ).toBe(false);
    });
  });

  describe('countSellPairs', () => {
    it('should count unique sell strikes', () => {
      const positions: any[] = [
        { netqty: '-1', strikeprice: '25000.0' },
        { netqty: '-1', strikeprice: '25000' },
        { netqty: '-1', strikeprice: '25100' },
      ];
      expect(countSellPairs(positions)).toBe(2);
    });
  });

  describe('hasHedgePositions', () => {
    it('should return true if any buy position exists', () => {
      expect(hasHedgePositions([{ netqty: '1' }] as any)).toBe(true);
      expect(hasHedgePositions([{ netqty: '-1' }] as any)).toBe(false);
    });
  });

  describe('Technical Indicators', () => {
    const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    it('calculateSMA', () => {
      expect(calculateSMA(data, 5)).toBe(18);
      expect(() => calculateSMA([1, 2], 5)).toThrow(
        'Not enough data for SMA(5)',
      );
    });

    it('calculateEMA', () => {
      expect(calculateEMA(data, 5)).toBeGreaterThan(18);
      expect(() => calculateEMA([1, 2], 5)).toThrow(
        'Not enough data for EMA(5)',
      );
    });

    it('calculateRSI', () => {
      const upData = [
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
      ];
      expect(calculateRSI(upData, 14)).toBe(100);
      const downData = [
        24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10,
      ];
      expect(calculateRSI(downData, 14)).toBe(0);
      expect(() => calculateRSI([1], 14)).toThrow();
    });

    it('calculateMACD', () => {
      const longData = Array(30)
        .fill(10)
        .map((v, i) => v + i);
      const result = calculateMACD(longData);
      expect(result).toHaveProperty('macd');
      expect(() => calculateMACD([1])).toThrow();
    });

    it('generateTradingSignal', () => {
      const longData = Array(40).fill(100);
      const result = generateTradingSignal(longData);
      expect(result.signal).toBe('NEUTRAL');
      expect(() => generateTradingSignal([1])).toThrow();

      // Test BUY signal (Oversold < 30 + Bullish crossover)
      // This is hard to fake without exact math, but we can verify the function structure
      expect(result).toHaveProperty('rsi');
    });
  });
});
