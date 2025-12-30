# Testing Guide - AFLWP Email Worker

## 📋 Table of Contents

- [Overview](#overview)
- [Testing Architecture](#testing-architecture)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking](#mocking)
- [Best Practices](#best-practices)
- [Coverage](#coverage)

## Overview

The AFLWP Email Worker project implements a comprehensive testing strategy with unit tests using Vitest. This document provides detailed information about the testing architecture, best practices, test structure, and testing utilities.

## Testing Architecture

The testing setup includes:

- **Unit Tests**: Individual component testing with mocked dependencies
- **Vitest Framework**: Fast unit testing framework with TypeScript support
- **Mocking**: BullMQ, Redis, Nodemailer, and service mocking
- **Coverage**: Code coverage reporting and analysis
- **Test Data**: Centralized test payloads and fixtures
- **SonarQube Integration**: Code quality analysis and quality gates

## Test Structure

### Directory Organization

```
tests/
├── unit/                        # Unit tests
│   ├── services/               # Service tests
│   │   ├── emailService.test.ts
│   │   └── emailTemplateService.test.ts
│   ├── utils/                  # Utility tests
│   │   └── logger.test.ts
│   ├── config.test.ts          # Configuration tests
│   └── emailWorker.test.ts     # Worker tests
├── setup/                       # Test setup files
│   └── mocks.ts                # Global mock configuration
├── mocks/                       # Centralized mocks (WordPress plugin pattern)
│   ├── infra/                  # Infrastructure mocks
│   │   ├── bullmq.ts           # BullMQ mock
│   │   └── ioredis.ts          # Redis mock
│   └── services/               # Service mocks
│       └── emailTemplateService.ts
└── mocks/                       # Centralized mocks
    └── index.ts                # Main mock exports
```

### Test File Naming

- **Unit Tests**: `*.test.ts` (e.g., `emailWorker.test.ts`)
- **Test Data**: Centralized in test files or mock files
- **Mocks**: `tests/mocks/infra/*.ts` (e.g., `bullmq.ts`, `ioredis.ts`)

## Running Tests

### Basic Commands

```bash
# Run all tests in watch mode
npm run tests

# Run unit tests with coverage
npm run tests:unit

# Run tests in a specific file
npm run tests -- tests/unit/config.test.ts

# Run tests matching a pattern
npm run tests -- -t "should send email"
```

### Test Configuration

Tests are configured in:

- `vitest.config.ts` - Main Vitest configuration
- `vitest.unit.config.ts` - Unit test specific configuration
- `vitest.setup.ts` - Global test setup (environment variables, mocks)
- `tests/setup/mocks.ts` - Mock reset configuration

## Writing Tests

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailWorker } from '@/emailWorker';

describe('EmailWorker', () => {
  let worker: EmailWorker;

  beforeEach(() => {
    // Setup before each test
    worker = new EmailWorker();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  describe('processJob', () => {
    it('should process job successfully', async () => {
      // Arrange
      const mockJob = {
        /* ... */
      };

      // Act
      await worker.processJob(mockJob);

      // Assert
      expect(/* ... */).toBeDefined();
    });
  });
});
```

### Test Patterns

#### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { EmailService } from '@/services/emailService';

describe('EmailService', () => {
  it('should send license purchase notification', async () => {
    const data = {
      emailType: 'license_purchase' as const,
      userId: 123,
      licenseId: 456,
      // ... other data
    };

    await EmailService.sendLicensePurchaseNotification(data);

    // Assert email was sent
    expect(/* ... */).toBeDefined();
  });
});
```

#### Integration Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailWorker } from '@/emailWorker';

describe('EmailWorker Integration', () => {
  let worker: EmailWorker;

  beforeEach(async () => {
    worker = new EmailWorker();
    await worker.start();
  });

  afterEach(async () => {
    if (worker) {
      await worker.shutdown();
    }
    // Clean up signal listeners
    const sigintListeners = [...process.listeners('SIGINT')];
    const sigtermListeners = [...process.listeners('SIGTERM')];
    sigintListeners.forEach(listener => {
      process.removeListener('SIGINT', listener);
    });
    sigtermListeners.forEach(listener => {
      process.removeListener('SIGTERM', listener);
    });
  });

  it('should process job successfully', async () => {
    // Test implementation
  });
});
```

## Mocking

### Centralized Mocks (WordPress Plugin Pattern)

The project follows the WordPress plugin pattern with centralized mocks in `tests/mocks/`:

- **`tests/mocks/infra/`** - Infrastructure mocks
  - `bullmq.ts` - BullMQ Worker and Queue mocks
  - `ioredis.ts` - Redis client mocks
- **`tests/mocks/services/`** - Service mocks
  - `emailTemplateService.ts` - Email Template Service mock

### Global Mocks (Auto-loaded)

Global mocks are defined in `tests/mocks/infra/` directory and automatically loaded via `vitest.setup.ts`:

- `tests/mocks/infra/bullmq.ts` - BullMQ Worker and Queue mocks
- `tests/mocks/infra/ioredis.ts` - Redis client mocks

### Using Centralized Mocks

```typescript
import { vi } from 'vitest';
import { EmailService } from '@/services/emailService';
import { EmailTemplateService } from '@/services/emailTemplateService';

describe('EmailService Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send email successfully', async () => {
    // Mock template service
    vi.spyOn(EmailTemplateService, 'renderTemplate').mockResolvedValue(
      '<html>...</html>'
    );

    // Mock nodemailer
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
    vi.spyOn(EmailService, 'getTransporter').mockReturnValue({
      sendMail: mockSendMail,
    } as any);

    const data = {
      /* ... */
    };
    await EmailService.sendLicensePurchaseNotification(data);

    expect(mockSendMail).toHaveBeenCalledTimes(2); // Admin and customer
  });
});
```

### Using Global Mocks

```typescript
import { vi } from 'vitest';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Mocks are automatically applied from tests/mocks/infra/ directory
// You can access mocked instances in tests

describe('Worker Tests', () => {
  it('should use mocked Worker', () => {
    const worker = new Worker('queue-name', handler);
    // worker is automatically mocked
    expect(worker.on).toBeDefined();
  });
});
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` for setup and cleanup
- Reset mocks between tests using `vi.clearAllMocks()`

### 2. Descriptive Test Names

```typescript
// Good
it('should send license purchase notification to admin and customer', async () => {
  // ...
});

// Bad
it('test1', async () => {
  // ...
});
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should send email successfully', async () => {
  // Arrange
  const mockJob = createMockJob();
  const expectedResult = {
    /* ... */
  };

  // Act
  await worker.processJob(mockJob);

  // Assert
  expect(/* ... */).toEqual(expectedResult);
});
```

### 4. Test Edge Cases

```typescript
describe('processJob', () => {
  it('should handle invalid email type', async () => {
    // Test validation failure
  });

  it('should handle SMTP connection failure', async () => {
    // Test SMTP error handling
  });

  it('should handle template rendering failure', async () => {
    // Test template error handling
  });
});
```

### 5. Clean Up Resources

```typescript
afterEach(async () => {
  // Shutdown worker
  if (worker) {
    await worker.shutdown();
  }

  // Clean up signal listeners
  const sigintListeners = [...process.listeners('SIGINT')];
  sigintListeners.forEach(listener => {
    process.removeListener('SIGINT', listener);
  });

  // Reset mocks
  vi.clearAllMocks();
});
```

## Coverage

### Coverage Configuration

Coverage is configured in `vitest.unit.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov', 'html', 'clover'],
  reportsDirectory: './coverage',
  include: ['source/**/*.ts'],
  exclude: [
    'source/**/*.d.ts',
    'tests/**',
    'source/**/node_modules/**',
    'build/**',
    'coverage/**',
  ],
}
```

### Coverage Thresholds

Coverage thresholds are defined in `vitest.unit.config.ts`:

```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 75,
    lines: 80,
    statements: 80
  }
}
```

### Viewing Coverage

```bash
# Generate coverage report
npm run tests:unit

# Coverage report is generated in coverage/ directory
# Open coverage/index.html in browser to view detailed report
```

## Test Organization

All tests are centralized in `tests/unit/` directory:

- `tests/unit/services/` - Service tests
- `tests/unit/utils/` - Utility tests
- `tests/unit/config.test.ts` - Configuration tests
- `tests/unit/emailWorker.test.ts` - Worker tests

This follows the WordPress plugin pattern where all tests are centralized in a single location for better organization and maintainability.

## Continuous Integration

Tests run automatically in CI/CD pipeline:

1. **Jenkins Pipeline**: Runs tests on every commit
2. **Coverage Reporting**: Generates coverage reports
3. **Quality Gates**: SonarQube analysis with quality gates
4. **Test Results**: Test results published as artifacts

## Troubleshooting

### Common Issues

1. **MaxListenersExceededWarning**: Clean up signal listeners in `afterEach`
2. **Mock not working**: Ensure mocks are defined before imports
3. **Test timeout**: Increase timeout for async operations
4. **Coverage not generated**: Check coverage configuration in `vitest.unit.config.ts`
5. **SMTP mock issues**: Ensure Nodemailer transporter is properly mocked

### Debugging Tests

```bash
# Run tests with verbose output
npm run tests -- --reporter=verbose

# Run specific test file
npm run tests -- tests/unit/config.test.ts

# Run tests matching pattern
npm run tests -- -t "should send"
```

---

**For more information, see:**

- [Vitest Documentation](https://vitest.dev/)
- [Main README](../README.md)
- [Documentation Index](./README.md)
