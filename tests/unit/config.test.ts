/**
 * Config Unit Tests
 *
 * Tests for the configuration module.
 * Note: Config module loads at import time, so we test with the environment
 * variables set in vitest.setup.ts
 */

import { describe, it, expect } from 'vitest';
import { redisConfig, emailConfig, appConfig } from '@/config';

describe('Config', () => {
  describe('redisConfig', () => {
    it('should load Redis configuration from environment variables', () => {
      expect(redisConfig.host).toBeDefined();
      expect(typeof redisConfig.host).toBe('string');
      expect(redisConfig.port).toBeDefined();
      expect(typeof redisConfig.port).toBe('number');
      expect(redisConfig.password).toBeDefined();
      expect(typeof redisConfig.password).toBe('string');
      expect(redisConfig.db).toBeDefined();
      expect(typeof redisConfig.db).toBe('number');
    });

    it('should have valid Redis port', () => {
      expect(redisConfig.port).toBeGreaterThan(0);
      expect(redisConfig.port).toBeLessThan(65536);
    });

    it('should have valid Redis database number', () => {
      expect(redisConfig.db).toBeGreaterThanOrEqual(0);
    });
  });

  describe('emailConfig', () => {
    it('should load SMTP configuration from environment variables', () => {
      expect(emailConfig.host).toBeDefined();
      expect(typeof emailConfig.host).toBe('string');
      expect(emailConfig.port).toBeDefined();
      expect(typeof emailConfig.port).toBe('number');
      expect(emailConfig.secure).toBeDefined();
      expect(typeof emailConfig.secure).toBe('boolean');
      expect(emailConfig.user).toBeDefined();
      expect(typeof emailConfig.user).toBe('string');
      expect(emailConfig.password).toBeDefined();
      expect(typeof emailConfig.password).toBe('string');
      expect(emailConfig.from).toBeDefined();
      expect(typeof emailConfig.from).toBe('string');
      expect(emailConfig.adminEmail).toBeDefined();
      expect(typeof emailConfig.adminEmail).toBe('string');
    });

    it('should have valid SMTP port', () => {
      expect(emailConfig.port).toBeGreaterThan(0);
      expect(emailConfig.port).toBeLessThan(65536);
    });

    it('should have valid email addresses', () => {
      expect(emailConfig.from).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(emailConfig.adminEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe('appConfig', () => {
    it('should load application configuration from environment variables', () => {
      expect(appConfig.nodeEnvironment).toBeDefined();
      expect(typeof appConfig.nodeEnvironment).toBe('string');
      expect(appConfig.debugEnabled).toBeDefined();
      expect(typeof appConfig.debugEnabled).toBe('boolean');
      expect(appConfig.packageVersion).toBeDefined();
      expect(typeof appConfig.packageVersion).toBe('string');
    });

    it('should have valid package version format', () => {
      expect(appConfig.packageVersion).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have valid node environment', () => {
      const validEnvs = ['development', 'production', 'test'];
      expect(validEnvs).toContain(appConfig.nodeEnvironment);
    });
  });
});
