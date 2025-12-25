/**
 * Application Configuration
 * 
 * This module exports configuration objects for the AFLWP Email Worker application.
 * All configuration values are loaded from environment variables and validated
 * at startup to ensure the application has all required settings.
 * 
 * @see {@link ./env.example.development} Development environment variables example
 * @see {@link ./env.example.production} Production environment variables example
 */

import { EmailWorkerError } from '@/api/v1/errors';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Require environment variable
 * 
 * Requires an environment variable and throws an error if it is not set.
 * This function ensures that all required configuration values are present
 * at application startup, preventing runtime errors due to missing configuration.
 * 
 * @param key - Environment variable key
 * @returns Environment variable value
 * 
 * @example
 * ```typescript
 * const redisHost = requireEnv("REDIS_HOST"); // Throws if REDIS_HOST is not set
 * const smtpHost = requireEnv("SMTP_HOST"); // Throws if SMTP_HOST is not set
 * ```
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new EmailWorkerError("INTERNAL_SERVER", `Environment variable ${key} is required`);
  }
  return value;
}

/**
 * Read package version from package.json
 * 
 * Reads the version field from package.json to maintain a single source of truth.
 * This avoids duplication between package.json and environment variables.
 * 
 * The function works both when running from source/ (development) and build/ (production).
 * 
 * @returns Package version string
 */
function getPackageVersion(): string {
  try {
    // Try multiple paths to handle both source/ and build/ execution contexts
    const possiblePaths = [
      join(process.cwd(), 'package.json'),           // Root directory (most common)
      join(__dirname, '../../package.json'),        // From source/ or build/
      join(__dirname, '../../../package.json'),    // From build/...
    ];
    
    for (const packageJsonPath of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.version) {
          return packageJson.version;
        }
      } catch {
        // Try next path
        continue;
      }
    }
    
    throw new EmailWorkerError("INTERNAL_SERVER", 'package.json not found in any expected location');
  } catch (error) {
    throw new EmailWorkerError("INTERNAL_SERVER", `Failed to read package version from package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Redis configuration
 * 
 * Contains Redis connection settings for queue operations.
 * These settings are used by BullMQ for job processing.
 */
export const redisConfig = {
  /** Redis host */
  host: requireEnv("REDIS_HOST"),
  /** Redis port */
  port: Number.parseInt(requireEnv("REDIS_PORT")),
  /** Redis password */
  password: requireEnv("REDIS_PASSWORD"),
  /** Redis database number */
  db: Number.parseInt(requireEnv("REDIS_DB")),
};

/**
 * SMTP configuration
 * 
 * Contains all settings for SMTP email sending operations.
 * These settings are used by Nodemailer to send emails.
 */
export const emailConfig = {
  /** SMTP host */
  host: requireEnv("SMTP_HOST"),
  /** SMTP port */
  port: Number.parseInt(requireEnv("SMTP_PORT")),
  /** SMTP secure (true for TLS on port 465, false for STARTTLS on port 587) */
  secure: requireEnv("SMTP_SECURE") === "true",
  /** SMTP username */
  user: requireEnv("SMTP_USER"),
  /** SMTP password */
  password: requireEnv("SMTP_PASSWORD"),
  /** Email address to send from */
  from: requireEnv("SMTP_FROM"),
  /** Admin email address for notifications */
  adminEmail: requireEnv("ADMIN_EMAIL"),
};

/**
 * Main application configuration
 * 
 * Contains core application settings including version, node environment,
 * and feature flags for debug mode.
 * 
 * All values are required and must be provided via environment variables.
 */
export const appConfig = {
  /** Application package version (read from package.json) */
  packageVersion: getPackageVersion(),
  /** Node environment behaviour production/development/test */
  nodeEnvironment: requireEnv("NODE_ENV"),
  /** Whether to enable debug mode (console logs) */
  debugEnabled: requireEnv("ENABLE_DEBUG") === "true",
};

