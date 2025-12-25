/**
 * Email Job Types
 * 
 * This module defines TypeScript types for email notification job data.
 * These types match the job data structure used by the EmailQueueService in the API.
 */

/**
 * License purchase notification job data
 */
export interface LicensePurchaseNotificationData {
  emailType: 'license_purchase';
  userId: number;
  licenseId: number;
  licenseKey: string;
  customerEmail: string;
  customerName: string;
  licenseTypeName: string;
  licenseTypeDescription: string;
  licenseTypeMaxDomains: number;
  stripeLicenseRecordId: number;
}

/**
 * Credit purchase notification job data
 */
export interface CreditPurchaseNotificationData {
  emailType: 'credit_purchase';
  userId: number;
  licenseId: number;
  creditAmount: number;
  transactionId: number;
  customerEmail: string;
  purchaseTypeName: string;
  purchaseTypeDescription: string;
  stripeCreditRecordId: number;
}

/**
 * Union type for all email notification job data
 */
export type EmailNotificationJobData =
  | LicensePurchaseNotificationData
  | CreditPurchaseNotificationData;

