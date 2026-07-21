/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import moment from 'moment-timezone';
import ScripMasterStore from '../../src/store/scripMasterStore';

jest.mock('fs');

describe('ScripMasterStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const instance = ScripMasterStore.getInstance();
    instance.setPostData({
      SCRIP_MASTER_JSON: [],
    });
  });

  it('should be a singleton', () => {
    const instance1 = ScripMasterStore.getInstance();
    const instance2 = ScripMasterStore.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with empty SCRIP_MASTER_JSON', () => {
    const instance = ScripMasterStore.getInstance();
    expect(instance.getPostData().SCRIP_MASTER_JSON).toEqual([]);
  });

  it('should set and get scrip master data', () => {
    const instance = ScripMasterStore.getInstance();
    const mockData: any = [{ symbol: 'NIFTY', token: '1' }];
    instance.setPostData({ SCRIP_MASTER_JSON: mockData });
    expect(instance.getPostData().SCRIP_MASTER_JSON).toEqual(mockData);
  });

  it('should return isExpired = true if file does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const instance = ScripMasterStore.getInstance();
    expect(instance.isExpired()).toBe(true);
  });

  it('should return isExpired = false if file was modified today (IST)', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({
      mtime: new Date(),
    });
    const instance = ScripMasterStore.getInstance();
    expect(instance.isExpired()).toBe(false);
  });

  it('should return isExpired = true if file was modified on a previous date', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const yesterday = moment().subtract(1, 'days').toDate();
    (fs.statSync as jest.Mock).mockReturnValue({
      mtime: yesterday,
    });
    const instance = ScripMasterStore.getInstance();
    expect(instance.isExpired()).toBe(true);
  });
});
