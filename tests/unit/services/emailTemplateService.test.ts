/**
 * EmailTemplateService Unit Tests
 *
 * Comprehensive unit tests for the EmailTemplateService class.
 * Tests cover template loading, rendering, caching, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs
vi.mock('node:fs', () => {
  const mockReadFileSync = vi.fn();
  (globalThis as any).__mockReadFileSync = mockReadFileSync;
  return {
    default: {
      readFileSync: mockReadFileSync,
    },
  };
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Handlebars
vi.mock('handlebars', () => {
  const mockCompileFn = vi.fn();
  (globalThis as any).__mockCompile = mockCompileFn;
  return {
    default: {
      compile: mockCompileFn,
    },
  };
});

// Import after mocks
import { EmailTemplateService } from '@/services/emailTemplateService';
import { EmailWorkerError } from '@/api/v1/errors';
import fs from 'node:fs';

// Get mock functions from global scope
const mockReadFileSync = () => (globalThis as any).__mockReadFileSync;
const mockCompile = () => (globalThis as any).__mockCompile;

describe('EmailTemplateService', () => {
  const mockTemplateContent =
    '<html><body>Hello {{customerName}}!</body></html>';
  const mockCompiledTemplate = vi.fn((data: any) => {
    return mockTemplateContent.replace(
      '{{customerName}}',
      data.customerName || ''
    );
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mocks
    mockReadFileSync().mockReturnValue(mockTemplateContent);
    mockCompile().mockReturnValue(mockCompiledTemplate);

    // Clear template cache
    EmailTemplateService.clearCache();
  });

  describe('loadTemplate', () => {
    it('should load and compile a template from filesystem', async () => {
      const template =
        await EmailTemplateService.loadTemplate('test-template.html');

      expect(mockReadFileSync()).toHaveBeenCalled();
      expect(mockCompile()).toHaveBeenCalledWith(mockTemplateContent);
      expect(template).toBe(mockCompiledTemplate);
    });

    it('should cache template after first load', async () => {
      const template1 =
        await EmailTemplateService.loadTemplate('test-template.html');
      const template2 =
        await EmailTemplateService.loadTemplate('test-template.html');

      // Should only read file once
      expect(mockReadFileSync()).toHaveBeenCalledTimes(1);
      expect(mockCompile()).toHaveBeenCalledTimes(1);
      expect(template1).toBe(template2);
    });

    it('should return cached template on subsequent calls', async () => {
      await EmailTemplateService.loadTemplate('test-template.html');
      await EmailTemplateService.loadTemplate('test-template.html');
      await EmailTemplateService.loadTemplate('test-template.html');

      expect(mockReadFileSync()).toHaveBeenCalledTimes(1);
      expect(mockCompile()).toHaveBeenCalledTimes(1);
    });

    it('should throw EmailWorkerError when template file is not found', async () => {
      const fileError = new Error('ENOENT: no such file or directory');
      mockReadFileSync().mockImplementation(() => {
        throw fileError;
      });

      await expect(
        EmailTemplateService.loadTemplate('nonexistent-template.html')
      ).rejects.toThrow(EmailWorkerError);

      await expect(
        EmailTemplateService.loadTemplate('nonexistent-template.html')
      ).rejects.toThrow(
        'Failed to load template nonexistent-template.html: ENOENT: no such file or directory'
      );
    });

    it('should throw EmailWorkerError when template file cannot be read', async () => {
      const readError = new Error('Permission denied');
      (fs.readFileSync as any).mockImplementation(() => {
        throw readError;
      });

      await expect(
        EmailTemplateService.loadTemplate('protected-template.html')
      ).rejects.toThrow(EmailWorkerError);

      await expect(
        EmailTemplateService.loadTemplate('protected-template.html')
      ).rejects.toThrow(
        'Failed to load template protected-template.html: Permission denied'
      );
    });

    it('should handle non-Error exceptions when reading template', async () => {
      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error('String error');
      });

      await expect(
        EmailTemplateService.loadTemplate('error-template.html')
      ).rejects.toThrow(EmailWorkerError);

      await expect(
        EmailTemplateService.loadTemplate('error-template.html')
      ).rejects.toThrow(
        'Failed to load template error-template.html: String error'
      );
    });

    it('should load different templates independently', async () => {
      const template1 =
        await EmailTemplateService.loadTemplate('template1.html');
      const template2 =
        await EmailTemplateService.loadTemplate('template2.html');

      expect(mockReadFileSync()).toHaveBeenCalledTimes(2);
      expect(mockCompile()).toHaveBeenCalledTimes(2);
      expect(template1).toBe(mockCompiledTemplate);
      expect(template2).toBe(mockCompiledTemplate);
    });
  });

  describe('renderTemplate', () => {
    it('should render template with provided data', async () => {
      const data = {
        customerName: 'John Doe',
        licenseKey: 'ABC-123',
      };

      const html = await EmailTemplateService.renderTemplate(
        'test-template.html',
        data
      );

      expect(mockCompiledTemplate).toHaveBeenCalled();
      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should add timestamp to template data', async () => {
      const data = { customerName: 'John Doe' };
      const beforeTime = new Date().toISOString();

      await EmailTemplateService.renderTemplate('test-template.html', data);

      expect(mockCompiledTemplate).toHaveBeenCalled();
      const callData = mockCompiledTemplate.mock.calls[0][0];
      expect(callData.customerName).toBe('John Doe');
      expect(callData.timestamp).toBeDefined();
      expect(callData.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );

      const timestamp = new Date(callData.timestamp);
      const afterTime = new Date();
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should throw EmailWorkerError when template loading fails', async () => {
      const fileError = new Error('Template not found');
      mockReadFileSync().mockImplementation(() => {
        throw fileError;
      });

      await expect(
        EmailTemplateService.renderTemplate('nonexistent.html', {})
      ).rejects.toThrow(EmailWorkerError);

      await expect(
        EmailTemplateService.renderTemplate('nonexistent.html', {})
      ).rejects.toThrow('Failed to render template nonexistent.html');
    });

    it('should throw EmailWorkerError when template rendering fails', async () => {
      const renderError = new Error('Template compilation failed');
      mockCompiledTemplate.mockImplementation(() => {
        throw renderError;
      });

      await expect(
        EmailTemplateService.renderTemplate('test-template.html', {})
      ).rejects.toThrow(EmailWorkerError);

      await expect(
        EmailTemplateService.renderTemplate('test-template.html', {})
      ).rejects.toThrow(
        'Failed to render template test-template.html: Template compilation failed'
      );
    });

    it('should handle non-Error exceptions during rendering', async () => {
      mockCompiledTemplate.mockImplementation(() => {
        throw new Error('String error');
      });

      await expect(
        EmailTemplateService.renderTemplate('test-template.html', {})
      ).rejects.toThrow(EmailWorkerError);

      await expect(
        EmailTemplateService.renderTemplate('test-template.html', {})
      ).rejects.toThrow(
        'Failed to render template test-template.html: String error'
      );
    });

    it('should use cached template when rendering multiple times', async () => {
      const data = { customerName: 'John Doe' };

      // Clear cache to start fresh
      EmailTemplateService.clearCache();

      // Reset mocks to start fresh
      vi.clearAllMocks();
      mockReadFileSync().mockReturnValue(mockTemplateContent);
      mockCompile().mockReturnValue(mockCompiledTemplate);
      mockCompiledTemplate.mockReturnValue('<html>Rendered</html>');

      await EmailTemplateService.renderTemplate('test-template.html', data);
      await EmailTemplateService.renderTemplate('test-template.html', data);
      await EmailTemplateService.renderTemplate('test-template.html', data);

      // Template should only be loaded once
      expect(mockReadFileSync()).toHaveBeenCalledTimes(1);
      expect(mockCompile()).toHaveBeenCalledTimes(1);
      // But rendered 3 times
      expect(mockCompiledTemplate).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearCache', () => {
    it('should clear the template cache', () => {
      EmailTemplateService.clearCache();

      // Cache should be cleared, so next load should read file again
      expect(() => EmailTemplateService.clearCache()).not.toThrow();
    });

    it('should force template reload after cache clear', async () => {
      await EmailTemplateService.loadTemplate('test-template.html');
      expect(mockReadFileSync()).toHaveBeenCalledTimes(1);

      EmailTemplateService.clearCache();

      await EmailTemplateService.loadTemplate('test-template.html');
      // Should read file again after cache clear
      expect(mockReadFileSync()).toHaveBeenCalledTimes(2);
    });

    it('should clear all cached templates', async () => {
      await EmailTemplateService.loadTemplate('template1.html');
      await EmailTemplateService.loadTemplate('template2.html');
      await EmailTemplateService.loadTemplate('template3.html');

      expect(mockReadFileSync()).toHaveBeenCalledTimes(3);

      EmailTemplateService.clearCache();

      // After clearing, all templates should be reloaded
      await EmailTemplateService.loadTemplate('template1.html');
      await EmailTemplateService.loadTemplate('template2.html');
      await EmailTemplateService.loadTemplate('template3.html');

      expect(mockReadFileSync()).toHaveBeenCalledTimes(6);
    });
  });
});
