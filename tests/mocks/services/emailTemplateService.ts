/**
 * EmailTemplateService Mock
 * 
 * Mock for EmailTemplateService used in tests.
 */

import { vi } from 'vitest';

export const mockRenderTemplate = vi.fn();
export const mockLoadTemplate = vi.fn();
export const mockClearCache = vi.fn();

vi.mock('@/services/emailTemplateService', () => ({
  EmailTemplateService: {
    renderTemplate: mockRenderTemplate,
    loadTemplate: mockLoadTemplate,
    clearCache: mockClearCache,
  },
}));

