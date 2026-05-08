/* eslint-disable @typescript-eslint/no-explicit-any */
import publicIp from 'public-ip';

import os from 'os';
import { getPublicIp, getLocalIp, getMacAddress } from '../../src/helpers/ip';

jest.mock('public-ip', () => ({
  v4: jest.fn(),
}));

jest.mock('os');

describe('IP helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicIp', () => {
    it('should return public IPv4 address on success', async () => {
      (publicIp.v4 as jest.Mock).mockResolvedValue('1.2.3.4');
      const ip = await getPublicIp();
      expect(ip).toBe('1.2.3.4');
    });

    it('should return fallback IP on failure', async () => {
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      (publicIp.v4 as jest.Mock).mockRejectedValue(new Error('Network error'));
      const ip = await getPublicIp();
      expect(ip).toBe('106.213.81.181');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getLocalIp', () => {
    it('should return local IPv4 address', () => {
      const mockInterfaces: any = {
        eth0: [
          { family: 'IPv6', address: '::1', internal: false },
          { family: 'IPv4', address: '127.0.0.1', internal: true },
          { family: 'IPv4', address: '192.168.1.10', internal: false },
        ],
      };
      (os.networkInterfaces as jest.Mock).mockReturnValue(mockInterfaces);
      const ip = getLocalIp();
      expect(ip).toBe('192.168.1.10');
    });

    it('should return 127.0.0.1 if no local IP found', () => {
      (os.networkInterfaces as jest.Mock).mockReturnValue({});
      const ip = getLocalIp();
      expect(ip).toBe('127.0.0.1');
    });
  });

  describe('getMacAddress', () => {
    it('should return MAC address', () => {
      const mockInterfaces: any = {
        eth0: [{ mac: '00:00:00:00:00:00' }, { mac: '00:1a:2b:3c:4d:5e' }],
      };
      (os.networkInterfaces as jest.Mock).mockReturnValue(mockInterfaces);
      const mac = getMacAddress();
      expect(mac).toBe('00:1a:2b:3c:4d:5e');
    });

    it('should return default MAC if none found', () => {
      (os.networkInterfaces as jest.Mock).mockReturnValue({});
      const mac = getMacAddress();
      expect(mac).toBe('00:00:00:00:00:00');
    });
  });
});
