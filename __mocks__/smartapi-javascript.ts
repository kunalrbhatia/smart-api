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
