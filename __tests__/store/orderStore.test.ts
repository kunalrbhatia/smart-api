import OrderStore from '../../src/store/orderStore';

jest.mock('../../src/helpers/functions', () => ({
  getNextExpiry: jest.fn().mockReturnValue('20FEB2025'),
}));

describe('OrderStore', () => {
  beforeEach(() => {
    // Reset singleton instance state manually
    const instance = OrderStore.getInstance();
    instance.setPostData({
      QUANTITY: 0,
      EXPIRYDATE: '20FEB2025',
      INDEX: '',
      LOSSPERLOT: 0,
      INDIAVIX: 0,
      MTM_BASELINE: 0,
    });
  });

  it('should be a singleton', () => {
    const instance1 = OrderStore.getInstance();
    const instance2 = OrderStore.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should have default values after initialization', () => {
    const instance = OrderStore.getInstance();
    const data = instance.getPostData();
    expect(data.QUANTITY).toBe(0);
    expect(data.EXPIRYDATE).toBe('20FEB2025');
    expect(data.INDEX).toBe('');
  });

  it('should set and get post data correctly', () => {
    const instance = OrderStore.getInstance();
    const newData = {
      QUANTITY: 50,
      EXPIRYDATE: '27FEB2025',
      INDEX: 'NIFTY',
      LOSSPERLOT: 1000,
      INDIAVIX: 15,
      MTM_BASELINE: 0,
    };
    instance.setPostData(newData);
    expect(instance.getPostData()).toEqual(newData);
  });

  it('should maintain state across different calls to getInstance', () => {
    const instance1 = OrderStore.getInstance();
    instance1.setPostData({
      QUANTITY: 100,
      EXPIRYDATE: '06MAR2025',
      INDEX: 'BANKNIFTY',
      LOSSPERLOT: 2000,
      INDIAVIX: 12,
      MTM_BASELINE: 0,
    });

    const instance2 = OrderStore.getInstance();
    expect(instance2.getPostData().QUANTITY).toBe(100);
    expect(instance2.getPostData().INDEX).toBe('BANKNIFTY');
  });
});
