import {
  fetchData,
  getNearestWeeklyExpiry,
  getLtpData,
  getLtpWithRetry,
  searchScrip,
  getScrip,
  getIndexScrip,
  getCandleData,
} from '../../../src/helpers/apiService/marketData';
import * as api from '../../../src/helpers/api';
import { logger } from '../../../src/helpers/logger';
import ScripMasterStore from '../../../src/store/scripMasterStore';
import { getAuthHeaders } from '../../../src/helpers/apiService/session';
import moment from 'moment-timezone';

// Mock dependencies
jest.mock('../../../src/helpers/api');
jest.mock('../../../src/helpers/logger');
jest.mock('../../../src/store/scripMasterStore');
jest.mock('../../../src/helpers/apiService/session');
jest.mock('krb-smart-api-module', () => ({
  ...jest.requireActual('krb-smart-api-module'),
  delay: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs');
import fs from 'fs';

describe('ApiService - MarketData', () => {
  let mockScripMasterStoreInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScripMasterStoreInstance = {
      getPostData: jest.fn().mockReturnValue({ SCRIP_MASTER_JSON: [] }),
      setPostData: jest.fn(),
      isExpired: jest.fn().mockReturnValue(false),
    };
    (ScripMasterStore.getInstance as jest.Mock).mockReturnValue(
      mockScripMasterStoreInstance,
    );
    (getAuthHeaders as jest.Mock).mockResolvedValue({
      Authorization: 'Bearer token',
    });
  });

  describe('fetchData', () => {
    it('should return data from store if available and not expired', async () => {
      const storedData = [{ symbol: 'NIFTY' }];
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: storedData,
      });

      const result = await fetchData();

      expect(result).toBe(storedData);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('should load from local file cache if memory is empty but file is not expired', async () => {
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: [],
      });
      mockScripMasterStoreInstance.isExpired.mockReturnValue(false);
      const cachedData = [{ symbol: 'BANKNIFTY' }];
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(cachedData),
      );

      const result = await fetchData();

      expect(result).toEqual(cachedData);
      expect(mockScripMasterStoreInstance.setPostData).toHaveBeenCalledWith({
        SCRIP_MASTER_JSON: cachedData,
      });
      expect(api.get).not.toHaveBeenCalled();
    });

    it('should fetch data from API if store is expired and save to local file', async () => {
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: [],
      });
      mockScripMasterStoreInstance.isExpired.mockReturnValue(true);
      const apiData = [{ symbol: 'NIFTY' }];
      (api.get as jest.Mock).mockResolvedValue(apiData);

      const result = await fetchData();

      expect(result).toEqual(apiData);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockScripMasterStoreInstance.setPostData).toHaveBeenCalledWith({
        SCRIP_MASTER_JSON: apiData,
      });
    });

    it('should throw error and log if API fails', async () => {
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: [],
      });
      mockScripMasterStoreInstance.isExpired.mockReturnValue(true);
      (api.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(fetchData()).rejects.toThrow('API Error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getNearestWeeklyExpiry', () => {
    it('should return the nearest future expiry date', async () => {
      const today = moment().format('DDMMMYYYY').toUpperCase();
      const nextWeek = moment()
        .add(7, 'days')
        .format('DDMMMYYYY')
        .toUpperCase();
      const past = moment()
        .subtract(7, 'days')
        .format('DDMMMYYYY')
        .toUpperCase();

      const scripMaster = [
        {
          name: 'NIFTY',
          exch_seg: 'NFO',
          instrumenttype: 'OPTIDX',
          expiry: today,
        },
        {
          name: 'NIFTY',
          exch_seg: 'NFO',
          instrumenttype: 'OPTIDX',
          expiry: nextWeek,
        },
        {
          name: 'NIFTY',
          exch_seg: 'NFO',
          instrumenttype: 'OPTIDX',
          expiry: past,
        },
      ];
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: scripMaster,
      });

      const result = await getNearestWeeklyExpiry('NIFTY');

      expect(result).toBe(today);
    });

    it('should throw error if no options found', async () => {
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: [],
      });
      (api.get as jest.Mock).mockResolvedValue([]); // Prevent recursive failure if fetchData is called

      await expect(getNearestWeeklyExpiry('NIFTY')).rejects.toThrow(
        'No options found for NIFTY',
      );
    });

    it('should throw error if no future expiry dates found', async () => {
      const past = moment()
        .subtract(7, 'days')
        .format('DDMMMYYYY')
        .toUpperCase();
      const scripMaster = [
        {
          name: 'NIFTY',
          exch_seg: 'NFO',
          instrumenttype: 'OPTIDX',
          expiry: past,
        },
      ];
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: scripMaster,
      });

      await expect(getNearestWeeklyExpiry('NIFTY')).rejects.toThrow(
        'No upcoming expiry dates found for NIFTY',
      );
    });
  });

  describe('getLtpData', () => {
    it('should return LTP data on success', async () => {
      const ltpResponse = { data: { ltp: 100 } };
      (api.post as jest.Mock).mockResolvedValue(ltpResponse);

      const result = await getLtpData({
        exchange: 'NSE',
        tradingsymbol: 'SBIN-EQ',
        symboltoken: '3045',
      });

      expect(result).toEqual({ ltp: 100 });
      expect(api.post).toHaveBeenCalled();
    });

    it('should throw error and log on failure', async () => {
      (api.post as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(
        getLtpData({
          exchange: 'NSE',
          tradingsymbol: 'SBIN-EQ',
          symboltoken: '3045',
        }),
      ).rejects.toThrow('Network Error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getLtpWithRetry', () => {
    it('should return LTP on first attempt if valid', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: { ltp: 100 } });

      const result = await getLtpWithRetry({
        exchange: 'NSE',
        symboltoken: '3045',
        tradingsymbol: 'SBIN-EQ',
      });

      expect(result.ltp).toBe(100);
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('should retry if LTP is invalid', async () => {
      (api.post as jest.Mock)
        .mockResolvedValueOnce({ data: { ltp: 0 } })
        .mockResolvedValueOnce({ data: { ltp: 100 } });

      const result = await getLtpWithRetry({
        exchange: 'NSE',
        symboltoken: '3045',
        tradingsymbol: 'SBIN-EQ',
      });

      expect(result.ltp).toBe(100);
      expect(api.post).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should retry on API error', async () => {
      (api.post as jest.Mock)
        .mockRejectedValueOnce(new Error('Transient Error'))
        .mockResolvedValueOnce({ data: { ltp: 100 } });

      const result = await getLtpWithRetry({
        exchange: 'NSE',
        symboltoken: '3045',
        tradingsymbol: 'SBIN-EQ',
      });

      expect(result.ltp).toBe(100);
      expect(api.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: { ltp: 0 } });

      await expect(
        getLtpWithRetry({
          exchange: 'NSE',
          symboltoken: '3045',
          tradingsymbol: 'SBIN-EQ',
          maxRetries: 2,
        }),
      ).rejects.toThrow('No valid LTP for SBIN-EQ after 2 attempts');
    });
  });

  describe('searchScrip', () => {
    it('should call API and return data', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: 'search-result' });

      const result = await searchScrip('NIFTY');

      expect(result).toBe('search-result');
      expect(api.post).toHaveBeenCalled();
    });
  });

  describe('getScrip', () => {
    it('should filter and return scrips correctly', async () => {
      const scripMaster = [
        {
          name: 'NIFTY',
          exch_seg: 'NFO',
          instrumenttype: 'OPTIDX',
          symbol: 'NIFTY20FEB2518000CE',
          expiry: '20FEB2025',
          token: '1',
        },
        {
          name: 'NIFTY',
          exch_seg: 'NFO',
          instrumenttype: 'OPTIDX',
          symbol: 'NIFTY20FEB2518000PE',
          expiry: '20FEB2025',
          token: '2',
        },
        {
          name: 'BANKNIFTY',
          exch_seg: 'NFO',
          instrumenttype: 'OPTIDX',
          symbol: 'BANKNIFTY20FEB2540000CE',
          expiry: '20FEB2025',
          token: '3',
        },
      ];
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: scripMaster,
      });

      const result = await getScrip({
        scriptName: 'NIFTY',
        strikePrice: '18000',
        optionType: 'CE',
        expiryDate: '20FEB2025',
      });

      expect(result).toHaveLength(1);
      expect(result[0].token).toBe('1');
    });

    it('should handle missing fields in scrip master', async () => {
      const scripMaster = [
        { token: '1' }, // Missing almost everything
      ];
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: scripMaster,
      });

      const result = await getScrip({
        scriptName: 'NIFTY',
        expiryDate: '20FEB2025',
      });
      expect(result).toHaveLength(0);
    });

    it('should throw error if scripMaster is empty', async () => {
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: [],
      });
      mockScripMasterStoreInstance.isExpired.mockReturnValue(true);
      (api.get as jest.Mock).mockResolvedValue([]); // Mock API to return empty array

      await expect(
        getScrip({ scriptName: 'NIFTY', expiryDate: '20FEB2025' }),
      ).rejects.toEqual('Algo: getScrip failed for NIFTY');
    });
  });

  describe('getIndexScrip', () => {
    it('should return matching index scrips', async () => {
      const scripMaster = [
        { name: 'NIFTY 50', instrumenttype: 'AMXIDX', token: '99926000' },
        { name: 'NIFTY', instrumenttype: 'OPTIDX', token: '1' },
      ];
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: scripMaster,
      });

      const result = await getIndexScrip({ scriptName: 'NIFTY 50' });

      expect(result).toHaveLength(1);
      expect(result[0].token).toBe('99926000');
    });

    it('should throw error if not found', async () => {
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: [],
      });
      mockScripMasterStoreInstance.isExpired.mockReturnValue(true);
      (api.get as jest.Mock).mockResolvedValue([]); // Mock API to return empty array

      await expect(getIndexScrip({ scriptName: 'UNKNOWN' })).rejects.toEqual(
        'Algo: getIndexScrip failed for UNKNOWN',
      );
    });
  });

  describe('getCandleData', () => {
    it('should return candle data on success', async () => {
      const candles = [[1, 2, 3, 4, 5]];
      (api.post as jest.Mock).mockResolvedValue({ data: candles });

      const result = await getCandleData({
        exchange: 'NSE',
        symboltoken: '3045',
        interval: 'ONE_MINUTE',
        fromdate: '2025-01-01 09:15',
        todate: '2025-01-01 15:30',
      });

      expect(result).toEqual(candles);
    });

    it('should throw error if response is not an array', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: 'not-array' });

      await expect(
        getCandleData({
          exchange: 'NSE',
          symboltoken: '3045',
          interval: 'ONE_MINUTE',
          fromdate: '2025-01-01 09:15',
          todate: '2025-01-01 15:30',
        }),
      ).rejects.toThrow('Invalid candle data format from API');
    });

    it('should throw error and log on API failure', async () => {
      (api.post as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(
        getCandleData({
          exchange: 'NSE',
          symboltoken: '3045',
          interval: 'ONE_MINUTE',
          fromdate: '2025-01-01 09:15',
          todate: '2025-01-01 15:30',
        }),
      ).rejects.toThrow('API Error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getNearestWeeklyExpiry', () => {
    it('should return nearest expiry for SENSEX using BFO segment', async () => {
      const scripMaster = [
        {
          name: 'SENSEX',
          exch_seg: 'BFO',
          instrumenttype: 'OPTIDX',
          symbol: 'SENSEX28AUG3080000CE',
          expiry: '28AUG2030',
          token: '100',
        },
      ];
      mockScripMasterStoreInstance.getPostData.mockReturnValue({
        SCRIP_MASTER_JSON: scripMaster,
      });

      const expiry = await getNearestWeeklyExpiry('SENSEX');
      expect(expiry).toBe('28AUG2030');
    });
  });
});
