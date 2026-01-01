/**
 * ioredis Mock
 *
 * Global mock for ioredis to prevent actual Redis connections during tests.
 */

import { vi } from 'vitest';

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
  })),
}));

