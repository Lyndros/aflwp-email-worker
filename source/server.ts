/**
 * Email Worker Server Entrypoint
 * 
 * This is the main entrypoint for the Email Worker application.
 * It creates and starts the Email Worker instance.
 * 
 * This module handles:
 * - Worker instantiation
 * - Startup error handling
 * - Process exit on startup failure
 * 
 * The worker instance is exported for potential use in tests or other contexts,
 * but typically this file is executed directly to start the worker service.
 * 
 * @module server
 * @see {@link ./emailWorker.ts} EmailWorker class implementation
 * 
 * @example
 * ```typescript
 * // Worker starts when this file is executed
 * node build/server.js
 * ```
 * 
 * @example
 * ```typescript
 * // In tests or other contexts, you can import the worker instance
 * import worker from './server';
 * await worker.shutdown();
 * ```
 */

import { EmailWorker } from '@/emailWorker';
import logger from '@/utils/logger';

/**
 * Email Worker instance
 * 
 * Created and started when this module is executed.
 * Exported for potential use in tests or programmatic control.
 * 
 * @type {EmailWorker}
 */
const worker = new EmailWorker();

/**
 * Start the worker
 * 
 * Attempts to start the Email Worker. If startup fails, logs the error
 * and exits the process with code 1.
 * 
 * @throws {Error} If worker startup fails, process exits with code 1
 */
try {
  await worker.start();
} catch (error) {
  logger.error({ error }, 'Failed to start Email Worker');
  process.exit(1);
}

export default worker;





