export const SmartAPI = jest.fn().mockImplementation(() => ({
  generateSession: jest.fn().mockResolvedValue({
    status: true,
    data: {
      jwtToken: 'fake-jwt',
      refreshToken: 'fake-refresh',
      feedToken: 'fake-feed',
    },
  }),
}));

export const WebSocketV2 = jest.fn().mockImplementation(() => ({
  connect: jest.fn().mockResolvedValue(undefined),
  fetchData: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
}));
