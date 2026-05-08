// jest.config.js
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!got|public-ip|@sindresorhus/.*|krb-smart-api-module|smartapi-javascript)/',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^got$': '<rootDir>/__mocks__/got.ts',
    '^public-ip$': '<rootDir>/__mocks__/public-ip.ts',
    '^smartapi-javascript$': '<rootDir>/__mocks__/smartapi-javascript.ts',
    '^krb-smart-api-module$': '<rootDir>/__mocks__/krb-smart-api-module.ts',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
