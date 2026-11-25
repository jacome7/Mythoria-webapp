/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.module\\.css$': '<rootDir>/src/test-utils/style-mock.cjs',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
