/** Jest executes API smoke tests through ts-jest without starting a network listener. */
module.exports={preset:'ts-jest',testEnvironment:'node',testMatch:['<rootDir>/tests/**/*.test.ts']};
