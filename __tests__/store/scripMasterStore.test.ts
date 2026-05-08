/* eslint-disable @typescript-eslint/no-explicit-any */
import ScripMasterStore from '../../src/store/scripMasterStore';

describe('ScripMasterStore', () => {
  beforeEach(() => {
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
});
