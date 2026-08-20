/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';

import { logger } from '../../src/helpers/logger';
import * as paperTrade from '../../src/helpers/paperTrade';

jest.mock('fs');
jest.mock('../../src/helpers/paperTrade');

describe('logger helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    (fs.appendFileSync as jest.Mock).mockImplementation(() => {});
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (paperTrade.isPaperMode as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logger.log should call console.log and write to file', () => {
    logger.log('test log', { key: 'value' });
    expect(console.log).toHaveBeenCalledWith('test log', { key: 'value' });
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/app-\d{4}-\d{2}-\d{2}\.log$/),
      expect.stringContaining('[INFO] test log {"key":"value"}'),
    );
  });

  it('logger.info should call console.info and write to file', () => {
    logger.info('test info');
    expect(console.info).toHaveBeenCalledWith('test info');
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/app-\d{4}-\d{2}-\d{2}\.log$/),
      expect.stringContaining('[INFO] test info'),
    );
  });

  it('logger.warn should call console.warn and write to file', () => {
    logger.warn('test warn');
    expect(console.warn).toHaveBeenCalledWith('test warn');
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/app-\d{4}-\d{2}-\d{2}\.log$/),
      expect.stringContaining('[WARN] test warn'),
    );
  });

  it('logger.error should call console.error and write to file', () => {
    const error = new Error('boom');
    logger.error('test error', error);
    expect(console.error).toHaveBeenCalledWith('test error', error);
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/app-\d{4}-\d{2}-\d{2}\.log$/),
      expect.stringContaining('[ERROR] test error - boom'),
    );
  });

  it('logger.mtm should call console.log and write to mtm log file', () => {
    logger.mtm('test mtm', 1500);
    expect(console.log).toHaveBeenCalledWith('[MTM]', 'test mtm', 1500);
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/mtm-\d{4}-\d{2}-\d{2}\.log$/),
      expect.stringContaining('[INFO] test mtm 1500'),
    );
  });

  it('should handle file write failures', () => {
    (fs.appendFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Disk full');
    });
    logger.log('test');
    expect(console.error).toHaveBeenCalled();
  });

  it('formatMessage should handle objects that cannot be stringified', () => {
    const circular: any = {};
    circular.self = circular;
    logger.log(circular);
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/app-\d{4}-\d{2}-\d{2}\.log$/),
      expect.stringContaining('[INFO] [object Object]'),
    );
  });
});
