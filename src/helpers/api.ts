import { delay } from 'krb-smart-api-module';
import { ALGO } from './constants';
import { logger } from './logger';

const handleResponse = async (response: Response, url: string) => {
  if (!response.ok) {
    const error = await response.text();
    logger.log(
      `${ALGO}: API request to ${url} failed with status ${response.status} and message ${error}`,
    );
    throw new Error(error);
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return response.json();
  }
  return response.text();
};

const requestWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  initialDelay: number = 3000,
) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      return await handleResponse(response, url);
    } catch (error: any) {
      attempt++;
      // If it's a rate limit error or a transient error, we retry.
      // SmartAPI usually returns "Access denied" or similar in the body, which handleResponse throws.
      if (attempt >= maxRetries) {
        throw error;
      }
      const backoffDelay = initialDelay * Math.pow(2, attempt - 1);
      logger.warn(
        `${ALGO}: API request to ${url} failed (Attempt ${attempt}/${maxRetries}). Retrying in ${backoffDelay}ms... Error: ${error.message}`,
      );
      await delay({ milliSeconds: backoffDelay });
    }
  }
};

export const post = async (url: string, data: any, headers: any) => {
  return requestWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
};

export const get = async (url: string, headers: any) => {
  return requestWithRetry(url, {
    method: 'GET',
    headers,
  });
};
