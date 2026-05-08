import { loginToSmartApi } from '../../src/helpers/smartApiLogin';
import { SmartAPI } from 'smartapi-javascript';
import totp from 'totp-generator';
import { getPublicIp, getLocalIp, getMacAddress } from '../../src/helpers/ip';

jest.mock('smartapi-javascript');
jest.mock('totp-generator');
jest.mock('../../src/helpers/ip');
jest.mock('../../src/helpers/logger');

describe('smartApiLogin', () => {
  const mockCreds = {
    APIKEY: 'test_api_key',
    CLIENT_CODE: 'test_client_code',
    CLIENT_PIN: 'test_client_pin',
    CLIENT_TOTP_PIN: 'test_secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPublicIp as jest.Mock).mockResolvedValue('127.0.0.1');
    (getLocalIp as jest.Mock).mockReturnValue('10.0.0.1');
    (getMacAddress as jest.Mock).mockReturnValue('00:00:00:00:00:00');
  });

  it('should login successfully generating TOTP from secret', async () => {
    (totp as jest.Mock).mockReturnValue('123456');
    const mockGenerateSession = jest.fn().mockResolvedValue({
      status: true,
      data: {
        jwtToken: 'jwt',
        refreshToken: 'refresh',
        feedToken: 'feed',
      },
    });

    (SmartAPI as jest.Mock).mockImplementation(() => ({
      generateSession: mockGenerateSession,
    }));

    const result = await loginToSmartApi(mockCreds);

    expect(totp).toHaveBeenCalledWith('test_secret');
    expect(mockGenerateSession).toHaveBeenCalledWith(
      'test_client_code',
      'test_client_pin',
      '123456',
    );
    expect(result).toEqual({
      jwtToken: 'jwt',
      refreshToken: 'refresh',
      feedToken: 'feed',
    });
  });

  it('should use TOTP directly if it is 6 digits', async () => {
    const credsWithCode = { ...mockCreds, CLIENT_TOTP_PIN: '654321' };
    const mockGenerateSession = jest.fn().mockResolvedValue({
      status: true,
      data: {
        jwtToken: 'jwt',
        refreshToken: 'refresh',
        feedToken: 'feed',
      },
    });

    (SmartAPI as jest.Mock).mockImplementation(() => ({
      generateSession: mockGenerateSession,
    }));

    await loginToSmartApi(credsWithCode);

    expect(totp).not.toHaveBeenCalled();
    expect(mockGenerateSession).toHaveBeenCalledWith(
      'test_client_code',
      'test_client_pin',
      '654321',
    );
  });

  it('should throw error if session generation fails', async () => {
    const mockGenerateSession = jest.fn().mockResolvedValue({
      status: false,
      message: 'Invalid credentials',
    });

    (SmartAPI as jest.Mock).mockImplementation(() => ({
      generateSession: mockGenerateSession,
    }));

    await expect(loginToSmartApi(mockCreds)).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('should throw default error if session generation fails without message', async () => {
    const mockGenerateSession = jest.fn().mockResolvedValue({
      status: false,
    });

    (SmartAPI as jest.Mock).mockImplementation(() => ({
      generateSession: mockGenerateSession,
    }));

    await expect(loginToSmartApi(mockCreds)).rejects.toThrow(
      'Failed to generate session',
    );
  });

  it('should throw error and log it if an exception occurs', async () => {
    const mockGenerateSession = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    (SmartAPI as jest.Mock).mockImplementation(() => ({
      generateSession: mockGenerateSession,
    }));

    await expect(loginToSmartApi(mockCreds)).rejects.toThrow('Network error');
  });
});
