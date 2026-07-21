import {
  getLtpData,
  searchScrip,
  fetchData,
} from '../../src/helpers/apiService';
import * as api from '../../src/helpers/api';
import DataStore from '../../src/store/dataStore';
import ScripMasterStore from '../../src/store/scripMasterStore';
import SmartSession from '../../src/store/smartSession';
import {
  GET_LTP_DATA_API,
  SEARCHSCRIPAPI,
  SCRIPMASTER,
} from '../../src/helpers/constants';

jest.mock('../../src/helpers/api');
jest.mock('../../src/store/dataStore');
jest.mock('../../src/store/orderStore');
jest.mock('../../src/store/scripMasterStore');
jest.mock('../../src/store/smartSession');
jest.mock('../../src/helpers/ip', () => ({
  getPublicIp: jest.fn().mockResolvedValue('127.0.0.1'),
  getLocalIp: jest.fn().mockReturnValue('10.0.0.1'),
  getMacAddress: jest.fn().mockReturnValue('00:00:00:00:00:00'),
}));

describe('apiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLtpData', () => {
    it('should fetch LTP data successfully', async () => {
      (SmartSession.getInstance as jest.Mock).mockReturnValue({
        getPostData: jest.fn().mockReturnValue({ jwtToken: 'test_token' }),
        setPostData: jest.fn(),
      });
      const getPostDataMock = jest
        .fn()
        .mockReturnValue({ APIKEY: 'test_api_key' });
      (DataStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: getPostDataMock,
      });
      (api.post as jest.Mock).mockResolvedValue({ data: { ltp: 100 } });

      const result = await getLtpData({
        exchange: 'NFO',
        tradingsymbol: 'NIFTY',
        symboltoken: '12345',
      });

      expect(api.post).toHaveBeenCalledWith(
        GET_LTP_DATA_API,
        { exchange: 'NFO', tradingsymbol: 'NIFTY', symboltoken: '12345' },
        expect.objectContaining({
          Authorization: 'Bearer test_token',
          'X-PrivateKey': 'test_api_key',
        }),
      );
      expect(result).toEqual({ ltp: 100 });
    });
  });

  describe('searchScrip', () => {
    it('should search for a scrip successfully', async () => {
      (SmartSession.getInstance as jest.Mock).mockReturnValue({
        getPostData: jest.fn().mockReturnValue({ jwtToken: 'test_token' }),
        setPostData: jest.fn(),
      });
      const getPostDataMock = jest
        .fn()
        .mockReturnValue({ APIKEY: 'test_api_key' });
      (DataStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: getPostDataMock,
      });
      (api.post as jest.Mock).mockResolvedValue({
        data: { scrip: 'test_scrip' },
      });

      const result = await searchScrip('NIFTY');

      expect(api.post).toHaveBeenCalledWith(
        SEARCHSCRIPAPI,
        { exchange: 'NFO', searchscrip: 'NIFTY' },
        expect.objectContaining({
          Authorization: 'Bearer test_token',
          'X-PrivateKey': 'test_api_key',
        }),
      );
      expect(result).toEqual({ scrip: 'test_scrip' });
    });
  });

  describe('fetchData', () => {
    it('should fetch scrip master data from API if not in store', async () => {
      const getPostDataMock = jest
        .fn()
        .mockReturnValue({ SCRIP_MASTER_JSON: [] });
      const setPostDataMock = jest.fn();
      (ScripMasterStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: getPostDataMock,
        setPostData: setPostDataMock,
        isExpired: jest.fn().mockReturnValue(true),
      });
      const mockScripMaster = [{ name: 'NIFTY' }];
      (api.get as jest.Mock).mockResolvedValue(mockScripMaster);

      const result = await fetchData();

      expect(api.get).toHaveBeenCalledWith(SCRIPMASTER, {});
      expect(setPostDataMock).toHaveBeenCalledWith({
        SCRIP_MASTER_JSON: mockScripMaster,
      });
      expect(result).toEqual(mockScripMaster);
    });

    it('should return scrip master data from store if available', async () => {
      const mockScripMaster = [{ name: 'NIFTY' }];
      const getPostDataMock = jest
        .fn()
        .mockReturnValue({ SCRIP_MASTER_JSON: mockScripMaster });
      (ScripMasterStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: getPostDataMock,
        isExpired: jest.fn().mockReturnValue(false),
      });

      const result = await fetchData();

      expect(api.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockScripMaster);
    });
  });
});
