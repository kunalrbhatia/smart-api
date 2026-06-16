import { get, post } from '../../src/helpers/api';
import { delay } from 'krb-smart-api-module';

jest.mock('krb-smart-api-module', () => ({
  delay: jest.fn().mockResolvedValue(undefined),
}));

global.fetch = jest.fn();

describe('api', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (delay as jest.Mock).mockClear();
  });

  describe('get', () => {
    it('should make a GET request and return JSON data', async () => {
      const mockData = { message: 'Success' };
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockData,
      });

      const data = await get('https://example.com/data', {});
      expect(fetch).toHaveBeenCalledWith('https://example.com/data', {
        method: 'GET',
        headers: {},
      });
      expect(data).toEqual(mockData);
    });

    it('should throw an error after max retries if the request fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(get('https://example.com/data', {})).rejects.toThrow(
        'Internal Server Error',
      );
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(delay).toHaveBeenCalledTimes(2);
    });
  });

  describe('post', () => {
    it('should make a POST request and return JSON data', async () => {
      const mockData = { message: 'Success' };
      const requestBody = { key: 'value' };
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => mockData,
      });

      const data = await post('https://example.com/data', requestBody, {});
      expect(fetch).toHaveBeenCalledWith('https://example.com/data', {
        method: 'POST',
        headers: {},
        body: JSON.stringify(requestBody),
      });
      expect(data).toEqual(mockData);
    });

    it('should throw an error after max retries if the request fails', async () => {
      const requestBody = { key: 'value' };
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(
        post('https://example.com/data', requestBody, {}),
      ).rejects.toThrow('Bad Request');
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});
