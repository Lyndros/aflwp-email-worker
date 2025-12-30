/**
 * Email Worker Class
 *
 * This module provides the EmailWorker class for processing email notification jobs from a Redis queue.
 * It handles job processing, error recovery, and graceful shutdown.
 *
 * This module exports only the EmailWorker class without any side effects.
 * The application entrypoint is in `server.ts`.
 *
 * Features:
 * - Queue Processing: Processes email notification jobs from Redis using BullMQ
 * - Retry Logic: Automatic retry with exponential backoff for failed jobs
 * - Error Handling: Comprehensive error handling and logging
 * - Graceful Shutdown: Proper cleanup on termination signals
 * - Concurrent Processing: Configurable concurrency for job processing
 *
 * Architecture:
 * - Uses BullMQ for reliable job queue management
 * - Supports multiple email types (license purchase, credit purchase)
 * - Maintains connection to Redis for job storage
 *
 * @see {@link ./server.ts} Application entrypoint
 */

import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import {
  EmailNotificationJobData,
  LicensePurchaseNotificationData,
  CreditPurchaseNotificationData,
} from '@/types/emailJobs';
import { redisConfig, appConfig, emailConfig } from '@/config';
import { EmailWorkerError } from '@/api/v1/errors';
import { EmailService } from '@/services/emailService';
import logger from '@/utils/logger';

/**
 * Email Worker Class
 *
 * Main worker class that processes email notification jobs from a Redis queue.
 * Handles job processing, error recovery, and email sending.
 *
 * @class EmailWorker
 * @example
 * ```typescript
 * const worker = new EmailWorker();
 * await worker.start();
 * // Worker is now ready to process jobs
 * ```
 */
export class EmailWorker {
  /** BullMQ worker instance for processing jobs */
  private worker?: Worker<EmailNotificationJobData>;
  /** Redis connection for job queue */
  private redis?: Redis;

  /**
   * Process a single email notification job from the queue
   *
   * Handles the complete lifecycle of processing an email notification job, including:
   * - Extracting job data and metadata
   * - Determining email type (license purchase or credit purchase)
   * - Sending appropriate email notification
   * - Logging job status
   *
   * @param {Job<EmailNotificationJobData>} job - The BullMQ job to process
   * @returns {Promise<void>} Promise that resolves when job is processed
   *
   * @private
   * @example
   * ```typescript
   * // This method is called automatically by BullMQ
   * await this.processJob(job);
   * ```
   */
  private async processJob(job: Job<EmailNotificationJobData>): Promise<void> {
    const { emailType, userId, customerEmail } = job.data;
    const jobId = job.id;

    // Type guard functions for discriminated union
    const isLicensePurchase = (
      data: EmailNotificationJobData
    ): data is LicensePurchaseNotificationData => {
      return data.emailType === 'license_purchase';
    };

    const isCreditPurchase = (
      data: EmailNotificationJobData
    ): data is CreditPurchaseNotificationData => {
      return data.emailType === 'credit_purchase';
    };

    // Log job processing start
    logger.info(
      {
        jobId,
        emailType,
        userId,
        customerEmail,
        to: emailConfig.adminEmail,
        // For license purchases
        ...(isLicensePurchase(job.data) && {
          licenseId: job.data.licenseId,
          customerName: job.data.customerName,
          stripeLicenseRecordId: job.data.stripeLicenseRecordId,
        }),
        // For credit purchases
        ...(isCreditPurchase(job.data) && {
          licenseId: job.data.licenseId,
          creditAmount: job.data.creditAmount,
          transactionId: job.data.transactionId,
          stripeCreditRecordId: job.data.stripeCreditRecordId,
        }),
        status: 'pending',
      },
      'Processing email notification job'
    );

    try {
      // Process job based on email type
      if (isLicensePurchase(job.data)) {
        await EmailService.sendLicensePurchaseNotification(job.data);
      } else if (isCreditPurchase(job.data)) {
        await EmailService.sendCreditPurchaseNotification(job.data);
      } else {
        throw new EmailWorkerError(
          'VALIDATION_ERROR',
          `Unknown email type: ${emailType}`
        );
      }

      // Log successful completion
      logger.info(
        {
          jobId,
          emailType,
          userId,
          customerEmail,
          // ID del registro de Stripe para rastreabilidad
          ...(isLicensePurchase(job.data) && {
            stripeLicenseRecordId: job.data.stripeLicenseRecordId,
          }),
          ...(isCreditPurchase(job.data) && {
            stripeCreditRecordId: job.data.stripeCreditRecordId,
          }),
          status: 'success',
          sentAt: new Date().toISOString(),
        },
        'Email notification sent successfully'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log failure
      logger.error(
        {
          jobId,
          emailType,
          userId,
          customerEmail,
          // ID del registro de Stripe para rastreabilidad
          ...(isLicensePurchase(job.data) && {
            stripeLicenseRecordId: job.data.stripeLicenseRecordId,
          }),
          ...(isCreditPurchase(job.data) && {
            stripeCreditRecordId: job.data.stripeCreditRecordId,
          }),
          status: 'failed',
          error: errorMessage,
          attempts: job.attemptsMade,
        },
        'Failed to send email notification'
      );

      // Re-throw error to let BullMQ handle retry logic
      throw error;
    }
  }

  /**
   * Start the Email Worker
   *
   * Initializes Redis connection, creates BullMQ worker, and sets up event handlers.
   * This method must be called after instantiating the worker to begin processing jobs.
   *
   * Signal handlers for graceful shutdown are registered automatically during startup.
   * The worker will begin processing jobs from the Redis queue immediately after
   * this method completes successfully.
   *
   * @public
   * @returns {Promise<void>} Promise that resolves when worker is initialized
   * @throws {Error} If Redis connection fails or worker cannot be created
   *
   * @example
   * ```typescript
   * const worker = new EmailWorker();
   * await worker.start();
   * // Worker is now processing jobs from Redis queue
   * ```
   */
  public async start(): Promise<void> {
    // Log startup information
    console.log(
      `🚀 AFLWP Email Worker ${appConfig.packageVersion} starting...`
    );
    console.log(`✅ Node environment: ${appConfig.nodeEnvironment}`);
    console.log(`🔗 Redis: ${redisConfig.host}:${redisConfig.port}`);

    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      maxRetriesPerRequest: null, // Required by BullMQ to avoid conflicts with its retry system
    });

    this.worker = new Worker<EmailNotificationJobData>(
      'email_notifications',
      this.processJob.bind(this),
      {
        connection: this.redis,
        concurrency: 5,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        stalledInterval: 30000,
        maxStalledCount: 1,
      }
    );

    this.setupEventHandlers();

    logger.info(
      {
        version: appConfig.packageVersion,
        nodeEnvironment: appConfig.nodeEnvironment,
        redisHost: redisConfig.host,
        redisPort: redisConfig.port,
      },
      'Email Worker initialized'
    );
  }

  /**
   * Setup event handlers for the worker and process
   *
   * Configures event listeners for:
   * - Worker lifecycle events (ready, active, completed, failed, stalled, error)
   * - Process termination signals (SIGINT, SIGTERM) for graceful shutdown
   *
   * Signal handlers are registered within the class to ensure proper cleanup
   * and encapsulation. The shutdown() method is called on signals, which performs
   * cleanup and then the signal handler calls process.exit().
   *
   * @private
   * @returns {void}
   *
   * @example
   * ```typescript
   * // This method is called automatically by start()
   * this.setupEventHandlers();
   * ```
   */
  private setupEventHandlers(): void {
    if (!this.worker) {
      return;
    }

    this.worker.on('ready', () => {
      console.log('✅ Email Worker is ready and listening for jobs');
      logger.info('Email Worker is ready and listening for jobs');
    });

    this.worker.on('active', job => {
      logger.debug({ jobId: job.id }, 'Job started processing');
    });

    this.worker.on('completed', job => {
      logger.info({ jobId: job.id }, 'Job completed');
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
    });

    this.worker.on('stalled', jobId => {
      logger.warn({ jobId }, 'Job stalled');
    });

    this.worker.on('error', err => {
      logger.error({ error: err.message }, 'Worker error');
    });

    // Graceful shutdown - signals handled within class
    process.on('SIGINT', () => {
      this.shutdown()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      this.shutdown()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  }

  /**
   * Gracefully shutdown the Email Worker
   *
   * Performs cleanup operations including:
   * - Closing the BullMQ worker
   * - Disconnecting from Redis
   *
   * Note: This method does not exit the process. The exit is handled by
   * the signal handlers that call this method.
   *
   * @public
   * @returns {Promise<void>} Promise that resolves when shutdown is complete
   * @throws {Error} If shutdown fails (error is logged and re-thrown for signal handlers)
   *
   * @example
   * ```typescript
   * // This method is called automatically on SIGINT/SIGTERM
   * await worker.shutdown();
   * ```
   */
  public async shutdown(): Promise<void> {
    console.log(
      `🔻 AFLWP Email Worker ${appConfig.packageVersion} shutting down...`
    );

    try {
      if (this.worker) {
        await this.worker.close();
        console.log('✅ Worker closed');
      }

      if (this.redis) {
        await this.redis.quit();
        console.log('✅ Redis disconnected');
      }

      logger.info('Email Worker shutdown complete');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error during shutdown:', errorMessage);
      logger.error({ error: errorMessage }, 'Error during shutdown');
      throw error; // Re-throw to let signal handlers handle exit
    }
  }
}
