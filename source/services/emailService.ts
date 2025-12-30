/**
 * Email Service
 *
 * This module provides functionality for sending emails using Nodemailer.
 * It handles email sending operations including template rendering and SMTP configuration.
 *
 * Features:
 * - SMTP email sending via Nodemailer
 * - Template-based email content
 * - Support for different email types (license purchase, credit purchase)
 * - Sends notifications to both admin and customer
 * - Error handling and logging
 *
 * @see {@link ./emailTemplateService.ts} Email template service
 * @see {@link ../config.ts} SMTP configuration
 */

import nodemailer, { Transporter } from 'nodemailer';
import { emailConfig } from '@/config';
import { EmailTemplateService } from './emailTemplateService';
import { EmailWorkerError } from '@/api/v1/errors';
import logger from '@/utils/logger';
import {
  LicensePurchaseNotificationData,
  CreditPurchaseNotificationData,
} from '@/types/emailJobs';

/**
 * Email Service for sending emails
 *
 * Handles all email sending operations including SMTP configuration,
 * template rendering, and email delivery.
 */
export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Get or create Nodemailer transporter
   *
   * Creates a singleton Nodemailer transporter instance with SMTP configuration.
   * The transporter is reused across all email sends for efficiency.
   *
   * @returns Configured Nodemailer transporter
   *
   * @private
   */
  private static getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure, // true for 465, false for other ports
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
        // Configure timeouts to avoid "Greeting never received" errors
        connectionTimeout: 60000, // 60 secondsß
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 secondsß
      });

      logger.info(
        { host: emailConfig.host, port: emailConfig.port },
        'Email transporter initialized'
      );
    }
    return this.transporter;
  }

  /**
   * Send license purchase notification email to admin and customer
   *
   * Sends email notifications to both the admin and the customer when a license purchase is completed.
   *
   * @param data - License purchase notification data
   * @returns Promise that resolves when emails are sent
   *
   * @throws {EMAIL_ERROR} When email sending fails
   * @throws {TEMPLATE_ERROR} When template rendering fails
   *
   * @example
   * ```typescript
   * await EmailService.sendLicensePurchaseNotification({
   *   emailType: 'license_purchase',
   *   userId: 123,
   *   licenseId: 456,
   *   licenseKey: 'ABC-123-DEF',
   *   customerEmail: 'user@example.com',
   *   customerName: 'John Doe',
   *   licenseTypeName: 'Professional',
   *   licenseTypeDescription: 'Professional License',
   *   licenseTypeMaxDomains: 5,
   *   stripeLicenseRecordId: 789
   * });
   * ```
   */
  public static async sendLicensePurchaseNotification(
    data: LicensePurchaseNotificationData
  ): Promise<void> {
    try {
      const transporter = this.getTransporter();

      // Send email to admin
      const adminHtml = await EmailTemplateService.renderTemplate(
        'admin-license-purchase-notification.html',
        {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          licenseKey: data.licenseKey,
          licenseTypeName: data.licenseTypeName,
          licenseTypeDescription: data.licenseTypeDescription,
          licenseTypeMaxDomains: data.licenseTypeMaxDomains,
        }
      );

      await transporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.adminEmail,
        subject: `New License Purchase: ${data.licenseTypeName}`,
        html: adminHtml,
      });

      logger.info(
        {
          userId: data.userId,
          licenseId: data.licenseId,
          customerEmail: data.customerEmail,
          licenseTypeName: data.licenseTypeName,
        },
        'License purchase notification email sent to admin'
      );

      // Send email to customer
      const customerHtml = await EmailTemplateService.renderTemplate(
        'customer-license-purchase-notification.html',
        {
          customerName: data.customerName,
          licenseKey: data.licenseKey,
          licenseTypeName: data.licenseTypeName,
          licenseTypeDescription: data.licenseTypeDescription,
          licenseTypeMaxDomains: data.licenseTypeMaxDomains,
        }
      );

      await transporter.sendMail({
        from: emailConfig.from,
        to: data.customerEmail,
        subject: `Your License is Ready: ${data.licenseTypeName}`,
        html: customerHtml,
      });

      logger.info(
        {
          userId: data.userId,
          licenseId: data.licenseId,
          customerEmail: data.customerEmail,
          licenseTypeName: data.licenseTypeName,
        },
        'License purchase notification email sent to customer'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { userId: data.userId, licenseId: data.licenseId, error: errorMessage },
        'Failed to send license purchase notification email'
      );
      throw new EmailWorkerError(
        'EMAIL_ERROR',
        `Failed to send email: ${errorMessage}`
      );
    }
  }

  /**
   * Send credit purchase notification email to admin and customer
   *
   * Sends email notifications to both the admin and the customer when a credit purchase is completed.
   *
   * @param data - Credit purchase notification data
   * @returns Promise that resolves when emails are sent
   *
   * @throws {EMAIL_ERROR} When email sending fails
   * @throws {TEMPLATE_ERROR} When template rendering fails
   *
   * @example
   * ```typescript
   * await EmailService.sendCreditPurchaseNotification({
   *   emailType: 'credit_purchase',
   *   userId: 123,
   *   licenseId: 456,
   *   creditAmount: 1000,
   *   transactionId: 789,
   *   customerEmail: 'user@example.com',
   *   purchaseTypeName: 'Standard Package',
   *   purchaseTypeDescription: 'Standard Credit Package',
   *   stripeCreditRecordId: 101
   * });
   * ```
   */
  public static async sendCreditPurchaseNotification(
    data: CreditPurchaseNotificationData
  ): Promise<void> {
    try {
      const transporter = this.getTransporter();

      // Send email to admin
      const adminHtml = await EmailTemplateService.renderTemplate(
        'admin-credit-purchase-notification.html',
        {
          customerEmail: data.customerEmail,
          creditAmount: data.creditAmount,
          purchaseTypeName: data.purchaseTypeName,
          purchaseTypeDescription: data.purchaseTypeDescription,
          transactionId: data.transactionId,
        }
      );

      await transporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.adminEmail,
        subject: `New Credit Purchase: ${data.purchaseTypeName}`,
        html: adminHtml,
      });

      logger.info(
        {
          userId: data.userId,
          licenseId: data.licenseId,
          customerEmail: data.customerEmail,
          creditAmount: data.creditAmount,
          purchaseTypeName: data.purchaseTypeName,
        },
        'Credit purchase notification email sent to admin'
      );

      // Send email to customer
      const customerHtml = await EmailTemplateService.renderTemplate(
        'customer-credit-purchase-notification.html',
        {
          creditAmount: data.creditAmount,
          purchaseTypeName: data.purchaseTypeName,
          purchaseTypeDescription: data.purchaseTypeDescription,
          transactionId: data.transactionId,
        }
      );

      await transporter.sendMail({
        from: emailConfig.from,
        to: data.customerEmail,
        subject: `Thank You for Your Credit Purchase: ${data.purchaseTypeName}`,
        html: customerHtml,
      });

      logger.info(
        {
          userId: data.userId,
          licenseId: data.licenseId,
          customerEmail: data.customerEmail,
          creditAmount: data.creditAmount,
          purchaseTypeName: data.purchaseTypeName,
        },
        'Credit purchase notification email sent to customer'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { userId: data.userId, licenseId: data.licenseId, error: errorMessage },
        'Failed to send credit purchase notification email'
      );
      throw new EmailWorkerError(
        'EMAIL_ERROR',
        `Failed to send email: ${errorMessage}`
      );
    }
  }
}
