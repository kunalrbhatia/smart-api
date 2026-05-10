// __mocks__/krb-smart-api-module.ts
export const getLastThursdayOfCurrentMonth = jest.fn(() => '20FEB2025');
export const isCurrentTimeGreater = jest.fn(() => false);
export const setCredentials = jest.fn();
export const delay = jest.fn();
export const DELAY = 1000;
export const getNearestStrike = jest.fn();
export const isTradingHoliday = jest.fn(() => false);
export default {
  getLastThursdayOfCurrentMonth,
  isCurrentTimeGreater,
  setCredentials,
  delay,
  DELAY,
  getNearestStrike,
  isTradingHoliday,
};
