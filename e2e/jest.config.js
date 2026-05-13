module.exports = {
  testMatch: ['**/*.e2e.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};