// Jest setup file
import { jest } from '@jest/globals';

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DB_PATH = ':memory:';

// Mock external dependencies that require network access
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          waitForTimeout: jest.fn(),
          on: jest.fn(),
          evaluate: jest.fn(),
          $: jest.fn(),
          waitForSelector: jest.fn()
        })
      }),
      close: jest.fn()
    })
  }
}));

// Mock Redis connection
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([])
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn()
  }))
}));

// Global test utilities
global.testUtils = {
  mockReq: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    get: jest.fn(),
    ...overrides
  }),
  
  mockRes: (overrides = {}) => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      ...overrides
    };
    return res;
  },
  
  mockNext: () => jest.fn()
};

// Setup and teardown
beforeAll(() => {
  // Suppress console logs during tests unless explicitly needed
  if (process.env.LOG_LEVEL === 'error') {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
  }
});

afterEach(() => {
  // Clear all mocks between tests
  jest.clearAllMocks();
});