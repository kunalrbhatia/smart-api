// __mocks__/krb-smart-api-module.ts
export const getLastThursdayOfCurrentMonth = jest.fn(() => '20FEB2025');
export const isCurrentTimeGreater = jest.fn(() => false);
export const setCredentials = jest.fn();
export const delay = jest.fn();
export const DELAY = 1000;
export const getNearestStrike = jest.fn();
export const isTradingHoliday = jest.fn(() => false);
export const getCredentials = jest.fn(() => ({
  api_key: 'mock_api_key',
  client_code: 'mock_client_code',
  client_pin: 'mock_client_pin',
  client_totp_pin: 'mock_client_totp_pin',
}));
export default {
  getLastThursdayOfCurrentMonth,
  isCurrentTimeGreater,
  setCredentials,
  getCredentials,
  delay,
  DELAY,
  getNearestStrike,
  isTradingHoliday,
};
