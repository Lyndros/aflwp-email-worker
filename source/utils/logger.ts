/**
 * Centralized Logging System
 * 
 * This module provides a centralized logging system using Pino logger.
 * All application logs are written to files in the /logs directory,
 * which is managed by logrotate on the host system.
 * 
 * Features:
 * - Structured JSON logging for production
 * - Pretty printing for development
 * - Separate log files for different log levels
 * - Automatic log file rotation via logrotate
 * - Performance optimized (async logging)
 * - Container-aware log file naming (supports multiple replicas)
 * 
 * Log File Naming:
 * In Docker environments, log files include the container hostname to support
 * multiple replicas. Each replica writes to its own log files, preventing conflicts
 * and enabling proper log aggregation:
 * - Production: "{service-name}-{container-hostname}-combined.log" and "{service-name}-{container-hostname}-error.log"
 *   Examples: 
 *     - "aflwp-email-worker-aflwp-control-prod-email-worker-1-combined.log" (replica 1)
 *     - "aflwp-email-worker-aflwp-control-prod-email-worker-2-combined.log" (replica 2)
 * - Local development: "aflwp-email-worker-{hostname}-combined.log" and "aflwp-email-worker-{hostname}-error.log"
 * 
 * The container hostname is obtained using os.hostname(). When hostname is not explicitly
 * set in docker-compose.yml, Docker automatically sets it to the container name generated
 * by Docker Compose (e.g., "aflwp-control-prod-email-worker-1"), which is essential for
 * distinguishing between multiple replicas of the same service.
 * 
 * Log Levels:
 * - fatal: System is unusable
 * - error: Error events that might still allow the app to continue
 * - warn: Warning messages
 * - info: Informational messages
 * - debug: Debug-level messages
 * - trace: Trace-level messages
 * 
 * Usage:
 * ```typescript
 * import logger from './utils/logger';
 * 
 * logger.info('Worker started');
 * logger.error('Job processing failed', { error });
 * logger.warn('Rate limit exceeded', { jobId });
 * ```
 * 
 * @see {@link https://getpino.io/} Pino documentation
 */

import pino from 'pino';
import { appConfig } from '@/config';
import fs from 'node:fs';
import os from 'node:os';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Log directory path
 *
 * Logs are written to /app/logs directory which is mounted as a volume
 * in Docker Compose and managed by logrotate on the host system.
 * The volume maps host directory ../../logs to /app/logs in the container.
 *
 * @see {@link ../../scripts/docker/docker-compose.yml} Docker Compose volume configuration
 */
const LOG_DIR = path.resolve(__dirname, '../../logs')

/**
 * Ensure log directory exists
 * 
 * Creates the log directory if it doesn't exist.
 * This is important for Docker environments where the directory
 * might not exist at container startup.
 * 
 * In test environments, this function is skipped to avoid permission issues.
 */
function ensureLogDirectory(): void {
  // Skip in test environment
  if (appConfig.nodeEnvironment === 'test') {
    return;
  }
  
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    // If we can't create the directory, log to stderr and continue
    // The application should still work, but logs won't be written to files
    console.error('Failed to create log directory:', error);
  }
}

/**
 * Create Pino logger instance
 * 
 * Configures Pino logger with appropriate settings based on environment.
 * In production, logs are written to files in JSON format.
 * In development, logs are pretty-printed to console only.
 * 
 * Log streams:
 * - Combined log: All logs (info, warn, error, fatal)
 * - Error log: Only errors and fatal messages
 * 
 * @returns Configured Pino logger instance
 */
function createLogger(): pino.Logger {
  const isTest: boolean = process.env.NODE_ENV === 'test' || appConfig.nodeEnvironment === 'test';
  
  // Test environment: Silent logger (no output)
  if (isTest) {
    return pino({
      level: 'silent',
    });
  }

  ensureLogDirectory();

  const isDevelopment = appConfig.nodeEnvironment === 'development';
  
  // Base logger configuration
  // The 'env' field uses nodeEnvironment (NODE_ENV) as it represents the Node.js runtime environment
  // This is standard practice in logging to identify the execution environment (development, production, test)
  // The 'target' field is for Docker deployment configuration, not runtime environment
  const loggerConfig: pino.LoggerOptions = {
    level: appConfig.debugEnabled ? 'debug' : 'info',
    base: {
      env: appConfig.nodeEnvironment, // NODE_ENV: development, production, or test
      version: appConfig.packageVersion,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  // Development: Pretty print to console only
  if (isDevelopment) {
    return pino({
      ...loggerConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Production: Write to files only (no console output)
  // Include container hostname in log file names to support multiple replicas
  const serviceName: string = 'aflwp-email-worker';
  const containerHostname: string = os.hostname();

  // Build the log file name: <serviceName>-<containerHostname>-combined.log
  const combinedLogStream = fs.createWriteStream(
    path.join(LOG_DIR, `${serviceName}-${containerHostname}-combined.log`),
    { flags: 'a' }
  );
  
  // Build the error log file name: <serviceName>-<containerHostname>-error.log
  const errorLogStream = fs.createWriteStream(
    path.join(LOG_DIR, `${serviceName}-${containerHostname}-error.log`),
    { flags: 'a' }
  );

  return pino(
    loggerConfig,
    pino.multistream([
      // All logs go to combined.log
      { level: 'info', stream: combinedLogStream },
      { level: 'warn', stream: combinedLogStream },
      { level: 'error', stream: combinedLogStream },
      { level: 'fatal', stream: combinedLogStream },
      // Errors and fatal only go to error.log
      { level: 'error', stream: errorLogStream },
      { level: 'fatal', stream: errorLogStream },
    ])
  );
}

/**
 * Centralized logger instance
 * 
 * This is the main logger instance used throughout the application.
 * Import this logger instead of using console.log/error/warn.
 * 
 * @example
 * ```typescript
 * import logger from './utils/logger';
 * 
 * logger.info('Job processed', { jobId: 1 });
 * logger.error('Processing error', { error: err.message });
 * ```
 */
const logger = createLogger();

export default logger;

