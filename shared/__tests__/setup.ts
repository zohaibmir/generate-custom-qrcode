// Test setup file for Jest
import 'reflect-metadata';

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAuthUser(): R;
    }
  }
}

// Custom matcher for AuthUser validation
expect.extend({
  toBeValidAuthUser(received) {
    const pass = received && 
                 typeof received.userId === 'string' && 
                 typeof received.email === 'string' &&
                 received.userId.length > 0 &&
                 received.email.includes('@');
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid AuthUser`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid AuthUser`,
        pass: false,
      };
    }
  },
});

// Mock console methods to reduce noise in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});