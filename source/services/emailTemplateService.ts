/**
 * Email Template Service
 *
 * This module provides functionality for loading and rendering email templates.
 * Templates are stored as HTML files in the source/templates/ directory and use
 * Handlebars for variable substitution.
 *
 * Features:
 * - Template loading from filesystem
 * - Handlebars-based template rendering
 * - Template caching for performance
 * - Support for admin and customer templates
 *
 * @see {@link ../templates/} Email template files
 */

import fs from 'node:fs';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { EmailWorkerError } from '@/api/v1/errors';
import logger from '@/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template directory path
 *
 * Templates are stored in source/templates/ directory.
 */
const TEMPLATES_DIR = path.resolve(__dirname, '../templates');

/**
 * Template cache
 *
 * Caches compiled Handlebars templates to avoid re-reading and re-compiling
 * templates on every email send. This improves performance significantly.
 */
const templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

/**
 * Email Template Service for loading and rendering email templates
 *
 * Handles all template-related operations including loading templates from files
 * and rendering them with data using Handlebars.
 */
export class EmailTemplateService {
  /**
   * Load template from filesystem
   *
   * Loads a template file from the templates directory. Templates are cached
   * after first load to improve performance.
   *
   * @param templateName - Name of the template file (e.g., 'admin-license-purchase-notification.html')
   * @returns Compiled Handlebars template
   *
   * @throws {TEMPLATE_ERROR} When template file is not found or cannot be read
   *
   * @example
   * ```typescript
   * const template = await EmailTemplateService.loadTemplate('admin-license-purchase-notification.html');
   * ```
   */
  public static async loadTemplate(
    templateName: string
  ): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (templateCache.has(templateName)) {
      return templateCache.get(templateName)!;
    }

    const templatePath = join(TEMPLATES_DIR, templateName);

    try {
      // Read template file
      const templateContent = fs.readFileSync(templatePath, 'utf-8');

      // Compile Handlebars template
      const compiledTemplate = Handlebars.compile(templateContent);

      // Cache compiled template
      templateCache.set(templateName, compiledTemplate);

      logger.debug(
        { templateName },
        `Template loaded and cached: ${templateName}`
      );

      return compiledTemplate;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { templateName, templatePath, error: errorMessage },
        'Failed to load template'
      );
      throw new EmailWorkerError(
        'TEMPLATE_ERROR',
        `Failed to load template ${templateName}: ${errorMessage}`
      );
    }
  }

  /**
   * Render template with data
   *
   * Loads (or retrieves from cache) a template and renders it with the provided data.
   *
   * @param templateName - Name of the template file
   * @param data - Data object to render template with
   * @returns Rendered HTML string
   *
   * @throws {TEMPLATE_ERROR} When template cannot be loaded or rendered
   *
   * @example
   * ```typescript
   * const html = await EmailTemplateService.renderTemplate('admin-license-purchase-notification.html', {
   *   customerName: 'John Doe',
   *   licenseKey: 'ABC-123-DEF',
   *   licenseTypeName: 'Professional'
   * });
   * ```
   */
  public static async renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): Promise<string> {
    try {
      const template = await this.loadTemplate(templateName);

      // Add timestamp to template data
      const dataWithTimestamp = {
        ...data,
        timestamp: new Date().toISOString(),
      };

      const rendered = template(dataWithTimestamp);

      logger.debug({ templateName }, `Template rendered: ${templateName}`);

      return rendered;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { templateName, error: errorMessage },
        'Failed to render template'
      );
      throw new EmailWorkerError(
        'TEMPLATE_ERROR',
        `Failed to render template ${templateName}: ${errorMessage}`
      );
    }
  }

  /**
   * Clear template cache
   *
   * Clears the template cache. Useful for testing or when templates are updated
   * and need to be reloaded.
   *
   * @example
   * ```typescript
   * EmailTemplateService.clearCache();
   * ```
   */
  public static clearCache(): void {
    templateCache.clear();
    logger.debug('Template cache cleared');
  }
}
