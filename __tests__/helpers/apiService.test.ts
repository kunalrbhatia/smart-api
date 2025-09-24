import { getLtpData, searchScrip, fetchData } from '../../src/helpers/apiService';
import * as api from '../../src/helpers/api';
import { getSmartSession } from 'krb-smart-api-module';
import DataStore from '../../src/store/dataStore';
import ScripMasterStore from '../../src/store/scripMasterStore';
import { GET_LTP_DATA_API, SEARCHSCRIPAPI, SCRIPMASTER } from '../../src/helpers/constants';

jest.mock('../../src/helpers/api');
jest.mock('krb-smart-api-module');
jest.mock('../../src/store/dataStore');
jest.mock('../../src/store/orderStore');
jest.mock('../../src/store/scripMasterStore');
jest.mock('krb-smart-api-module', () => ({
  getSmartSession: jest.fn(),   // 👈 ensure it’s a mock
}));
describe('apiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLtpData', () => {
    it('should fetch LTP data successfully', async () => {
      (getSmartSession as jest.Mock).mockResolvedValue({ jwtToken: 'test_token' });
      const getPostDataMock = jest.fn().mockReturnValue({ APIKEY: 'test_api_key' });
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
        })
      );
      expect(result).toEqual({ ltp: 100 });
    });
  });

  describe('searchScrip', () => {
    it('should search for a scrip successfully', async () => {
      (getSmartSession as jest.Mock).mockResolvedValue({ jwtToken: 'test_token' });
      const getPostDataMock = jest.fn().mockReturnValue({ APIKEY: 'test_api_key' });
      (DataStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: getPostDataMock,
      });
      (api.post as jest.Mock).mockResolvedValue({ data: { scrip: 'test_scrip' } });

      const result = await searchScrip('NIFTY');

      expect(api.post).toHaveBeenCalledWith(
        SEARCHSCRIPAPI,
        { exchange: 'NFO', searchscrip: 'NIFTY' },
        expect.objectContaining({
          Authorization: 'Bearer test_token',
          'X-PrivateKey': 'test_api_key',
        })
      );
      expect(result).toEqual({ scrip: 'test_scrip' });
    });
  });

  describe('fetchData', () => {
    it('should fetch scrip master data from API if not in store', async () => {
      const getPostDataMock = jest.fn().mockReturnValue({ SCRIP_MASTER_JSON: [] });
      const setPostDataMock = jest.fn();
      (ScripMasterStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: getPostDataMock,
        setPostData: setPostDataMock,
      });
      const mockScripMaster = [{ name: 'NIFTY' }];
      (api.get as jest.Mock).mockResolvedValue(mockScripMaster);

      const result = await fetchData();

      expect(api.get).toHaveBeenCalledWith(SCRIPMASTER, {});
      expect(setPostDataMock).toHaveBeenCalledWith({ SCRIP_MASTER_JSON: mockScripMaster });
      expect(result).toEqual(mockScripMaster);
    });

    it('should return scrip master data from store if available', async () => {
      const mockScripMaster = [{ name: 'NIFTY' }];
      const getPostDataMock = jest.fn().mockReturnValue({ SCRIP_MASTER_JSON: mockScripMaster });
      (ScripMasterStore.getInstance as jest.Mock).mockReturnValue({
        getPostData: getPostDataMock,
      });

      const result = await fetchData();

      expect(api.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockScripMaster);
    });
  });
});
