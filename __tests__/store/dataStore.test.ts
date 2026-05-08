import DataStore from '../../src/store/dataStore';

describe('DataStore', () => {
  beforeEach(() => {
    const instance = DataStore.getInstance();
    instance.setPostData({
      APIKEY: '',
      CLIENT_CODE: '',
      CLIENT_PIN: '',
      CLIENT_TOTP_PIN: '',
    });
  });

  it('should be a singleton', () => {
    const instance1 = DataStore.getInstance();
    const instance2 = DataStore.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with empty strings', () => {
    const store = DataStore.getInstance();
    const data = store.getPostData();
    expect(data.APIKEY).toBe('');
    expect(data.CLIENT_CODE).toBe('');
    expect(data.CLIENT_PIN).toBe('');
    expect(data.CLIENT_TOTP_PIN).toBe('');
  });

  it('should set and get post data', () => {
    const store = DataStore.getInstance();
    const mockData = {
      APIKEY: 'key',
      CLIENT_CODE: 'code',
      CLIENT_PIN: 'pin',
      CLIENT_TOTP_PIN: 'totp',
    };
    store.setPostData(mockData);
    expect(store.getPostData()).toEqual(mockData);
  });
});
