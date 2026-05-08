import {
  getSmartSession,
  getAuthHeaders,
} from '../../../src/helpers/apiService/session';
import { loginToSmartApi } from '../../../src/helpers/smartApiLogin';
import SmartSession from '../../../src/store/smartSession';
import DataStore from '../../../src/store/dataStore';
import * as ipHelper from '../../../src/helpers/ip';

// Mock dependencies
jest.mock('../../../src/helpers/smartApiLogin');
jest.mock('../../../src/helpers/ip');
jest.mock('../../../src/store/smartSession');
jest.mock('../../../src/store/dataStore');

describe('ApiService - Session', () => {
  let mockSmartSessionInstance: any;
  let mockDataStoreInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup SmartSession mock
    mockSmartSessionInstance = {
      getPostData: jest.fn(),
      setPostData: jest.fn(),
    };
    (SmartSession.getInstance as jest.Mock).mockReturnValue(
      mockSmartSessionInstance,
    );

    // Setup DataStore mock
    mockDataStoreInstance = {
      getPostData: jest.fn().mockReturnValue({ APIKEY: 'test-api-key' }),
    };
    (DataStore.getInstance as jest.Mock).mockReturnValue(mockDataStoreInstance);

    // Setup IP/MAC mocks
    (ipHelper.getPublicIp as jest.Mock).mockResolvedValue('1.2.3.4');
    (ipHelper.getLocalIp as jest.Mock).mockReturnValue('192.168.1.1');
    (ipHelper.getMacAddress as jest.Mock).mockReturnValue('00:00:00:00:00:00');
  });

  describe('getSmartSession', () => {
    it('should return existing session if jwtToken is present', async () => {
      const existingSession = { jwtToken: 'existing-token' };
      mockSmartSessionInstance.getPostData.mockReturnValue(existingSession);

      const result = await getSmartSession();

      expect(result).toBe(existingSession);
      expect(loginToSmartApi).not.toHaveBeenCalled();
    });

    it('should login and return new session if jwtToken is missing', async () => {
      mockSmartSessionInstance.getPostData.mockReturnValue(null);
      const newSession = { jwtToken: 'new-token' };
      (loginToSmartApi as jest.Mock).mockResolvedValue(newSession);

      const result = await getSmartSession();

      expect(result).toBe(newSession);
      expect(loginToSmartApi).toHaveBeenCalled();
      expect(mockSmartSessionInstance.setPostData).toHaveBeenCalledWith(
        newSession,
      );
    });

    it('should login and return new session if session object is empty', async () => {
      mockSmartSessionInstance.getPostData.mockReturnValue({});
      const newSession = { jwtToken: 'new-token' };
      (loginToSmartApi as jest.Mock).mockResolvedValue(newSession);

      const result = await getSmartSession();

      expect(result).toBe(newSession);
      expect(loginToSmartApi).toHaveBeenCalled();
    });
  });

  describe('getAuthHeaders', () => {
    it('should return correctly formatted headers', async () => {
      const session = { jwtToken: 'test-jwt' };
      mockSmartSessionInstance.getPostData.mockReturnValue(session);

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        Authorization: 'Bearer test-jwt',
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '192.168.1.1',
        'X-ClientPublicIP': '1.2.3.4',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': 'test-api-key',
      });
    });

    it('should wait for getSmartSession to resolve', async () => {
      mockSmartSessionInstance.getPostData.mockReturnValue(null);
      (loginToSmartApi as jest.Mock).mockResolvedValue({
        jwtToken: 'async-token',
      });

      const headers = await getAuthHeaders();

      expect(headers.Authorization).toBe('Bearer async-token');
    });
  });
});
