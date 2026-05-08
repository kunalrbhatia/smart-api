import SmartSession from '../../src/store/smartSession';

describe('SmartSession', () => {
  beforeEach(() => {
    const instance = SmartSession.getInstance();
    instance.setPostData({
      feedToken: '',
      jwtToken: '',
      refreshToken: '',
    });
  });

  it('should be a singleton', () => {
    const instance1 = SmartSession.getInstance();
    const instance2 = SmartSession.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with empty tokens', () => {
    const instance = SmartSession.getInstance();
    const data = instance.getPostData();
    expect(data.feedToken).toBe('');
    expect(data.jwtToken).toBe('');
    expect(data.refreshToken).toBe('');
  });

  it('should set and get session data correctly', () => {
    const instance = SmartSession.getInstance();
    const mockData = {
      feedToken: 'feed123',
      jwtToken: 'jwt123',
      refreshToken: 'refresh123',
    };
    instance.setPostData(mockData);
    expect(instance.getPostData()).toEqual(mockData);
  });
});
