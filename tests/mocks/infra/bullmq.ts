/**
 * BullMQ Mock
 * 
 * Global mock for BullMQ to prevent actual Redis connections during tests.
 */

import { vi } from 'vitest';

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    close: vi.fn(),
  })),
  Redis: vi.fn(),
}));

