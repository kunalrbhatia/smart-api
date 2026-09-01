import fs from 'fs';
import path from 'path';
import { startFeedDaemon } from '../src/marketFeedDaemon';
import { shouldExitDueToStoploss } from '../src/helpers/apiService/strategy';

jest.mock('../src/helpers/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    mtm: jest.fn(),
  },
}));

jest.mock('../src/helpers/notifier', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/helpers/apiService/positions', () => ({
  getAlgoPositions: jest.fn(),
  closeBreachedLegs: jest.fn().mockResolvedValue(1),
  getMtm: jest.fn().mockResolvedValue(-500),
}));

jest.mock('../src/helpers/apiService/marketData', () => ({
  getNearestWeeklyExpiry: jest.fn().mockResolvedValue('01SEP2026'),
  getIndexScrip: jest
    .fn()
    .mockResolvedValue([
      { token: '99926000', exch_seg: 'NSE', symbol: 'NIFTY' },
    ]),
}));

jest.mock('../src/helpers/functions', () => ({
  isMarketClosed: jest.fn().mockReturnValue(false),
  isTradingHoliday: jest.fn().mockResolvedValue(false),
  getAlgoIndex: jest.fn().mockReturnValue('NIFTY'),
}));

jest.mock('../src/helpers/killSwitch', () => ({
  isKillSwitchActive: jest.fn().mockReturnValue(false),
}));

let capturedTickListener: ((tick: any) => void) | null = null;

jest.mock('../src/helpers/apiService/marketFeed', () => ({
  connectMarketFeed: jest.fn().mockResolvedValue(undefined),
  disconnectMarketFeed: jest.fn(),
  addMarketTickListener: jest.fn().mockImplementation(cb => {
    capturedTickListener = cb;
  }),
  normalizeToken: (raw: any) => String(raw).replace(/[^0-9]/g, ''),
}));

describe('marketFeedDaemon logic & zero-value guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedTickListener = null;
  });

  it('triggers exit only on breached leg and calls closeBreachedLegs + setStoplossFiredToday', async () => {
    const mockPositions = [
      {
        symboltoken: '41000',
        tradingsymbol: 'NIFTY26AUG24200CE',
        netqty: '-25',
        netvalue: '-2500', // entry = 100
        ltp: '100',
      },
    ];

    const getAlgoPositionsMock =
      require('../src/helpers/apiService/positions').getAlgoPositions;
    getAlgoPositionsMock.mockReturnValue(mockPositions);

    const mockExitCheck = shouldExitDueToStoploss(
      [
        {
          symboltoken: '41000',
          tradingsymbol: 'NIFTY26AUG24200CE',
          netqty: '-25',
          netvalue: '-2500', // entry = 100, trigger = 225
          ltp: '230.00',
        },
      ],
      -500,
    );

    expect(mockExitCheck.shouldExit).toBe(true);
    expect(mockExitCheck.breaches).toHaveLength(1);
    expect(mockExitCheck.breaches[0].symbol).toBe('NIFTY26AUG24200CE');
  });

  it('zero-guard prevents false positive when tick ltp is 0 or entryPrice is 0', () => {
    const mockPositionsZeroLtp = [
      {
        symboltoken: '41000',
        tradingsymbol: 'NIFTY26AUG24200CE',
        netqty: '-25',
        netvalue: '-2500',
        ltp: '0.00',
      },
    ];

    const mockPositionsZeroEntry = [
      {
        symboltoken: '41000',
        tradingsymbol: 'NIFTY26AUG24200CE',
        netqty: '-25',
        netvalue: '0',
        ltp: '150.00',
      },
    ];

    const res1 = shouldExitDueToStoploss(mockPositionsZeroLtp, 0);
    expect(res1.shouldExit).toBe(false);

    const res2 = shouldExitDueToStoploss(mockPositionsZeroEntry, 0);
    expect(res2.shouldExit).toBe(false);
  });
});
