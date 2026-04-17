module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: ['<rootDir>/__mocks__/jestSetupAfterEnv.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
