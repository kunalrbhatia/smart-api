import { ALGO } from './constants';
import { logger } from './logger';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.text();
    logger.log(`${ALGO}: API request failed with status ${response.status} and message ${error}`);
    throw new Error(error);
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return response.json();
  }
  return response.text();
};

export const post = async (url: string, data: any, headers: any) => {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const get = async (url: string, headers: any) => {
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  return handleResponse(response);
};
