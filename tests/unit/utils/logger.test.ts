/**
 * Logger Unit Tests
 *
 * Tests for the logger utility module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import logger from '@/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Logger is already created and exported, so we test the exported instance
  });

  describe('logger instance', () => {
    it('should export a logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });

    it('should have info method', () => {
      expect(() => logger.info('Test message')).not.toThrow();
      expect(() => logger.info({ key: 'value' }, 'Test message')).not.toThrow();
    });

    it('should have error method', () => {
      expect(() => logger.error('Error message')).not.toThrow();
      expect(() =>
        logger.error({ error: 'test' }, 'Error message')
      ).not.toThrow();
    });

    it('should have debug method', () => {
      expect(() => logger.debug('Debug message')).not.toThrow();
      expect(() =>
        logger.debug({ key: 'value' }, 'Debug message')
      ).not.toThrow();
    });

    it('should have warn method', () => {
      expect(() => logger.warn('Warning message')).not.toThrow();
      expect(() =>
        logger.warn({ key: 'value' }, 'Warning message')
      ).not.toThrow();
    });

    it('should have fatal method', () => {
      expect(() => logger.fatal('Fatal message')).not.toThrow();
      expect(() =>
        logger.fatal({ key: 'value' }, 'Fatal message')
      ).not.toThrow();
    });

    it('should handle structured logging', () => {
      const logData = {
        userId: 123,
        action: 'test',
        metadata: { key: 'value' },
      };

      expect(() =>
        logger.info(logData, 'Structured log message')
      ).not.toThrow();
    });

    it('should handle error logging with error objects', () => {
      const error = new Error('Test error');
      expect(() =>
        logger.error({ error: error.message }, 'Error occurred')
      ).not.toThrow();
    });
  });
});
