// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },

  transformIgnorePatterns: [
    '/node_modules/(?!got|public-ip|@sindresorhus/.*|krb-smart-api-module|smartapi-javascript)/',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.jest.json',
    },
  },
  moduleNameMapper: {
    '^got$': '<rootDir>/__mocks__/got.ts',
    '^public-ip$': '<rootDir>/__mocks__/public-ip.ts',
    '^smartapi-javascript$': '<rootDir>/__mocks__/smartapi-javascript.ts',
    '^krb-smart-api-module$': '<rootDir>/__mocks__/krb-smart-api-module.ts',
  },
};
