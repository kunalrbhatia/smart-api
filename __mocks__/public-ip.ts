// __mocks__/public-ip.ts
export default {
  v4: jest.fn().mockResolvedValue('127.0.0.1'),
  v6: jest.fn().mockResolvedValue('::1'),
};
