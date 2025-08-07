// Jest setup file for global test configuration
// This file is executed before each test file

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    // Uncomment to ignore specific console methods
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};