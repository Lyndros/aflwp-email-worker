/**
 * EmailWorker Unit Tests
 * 
 * Tests for the EmailWorker class.
 * Tests cover job processing logic and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  LicensePurchaseNotificationData,
  CreditPurchaseNotificationData,
} from '@/types/emailJobs';
import type { Job } from 'bullmq';

// Get mock functions from global scope
const mockSendLicensePurchaseNotification = () => (globalThis as any).__mockSendLicensePurchaseNotification;
const mockSendCreditPurchaseNotification = () => (globalThis as any).__mockSendCreditPurchaseNotification;

// Import after mocks
import { EmailWorker } from '@/emailWorker';
import { EmailWorkerError } from '@/api/v1/errors';

// Mock EmailService
vi.mock('@/services/emailService', () => {
  const mockSendLicensePurchaseNotificationFn = vi.fn();
  const mockSendCreditPurchaseNotificationFn = vi.fn();
  
  (globalThis as any).__mockSendLicensePurchaseNotification = mockSendLicensePurchaseNotificationFn;
  (globalThis as any).__mockSendCreditPurchaseNotification = mockSendCreditPurchaseNotificationFn;
  
  return {
    EmailService: {
      sendLicensePurchaseNotification: mockSendLicensePurchaseNotificationFn,
      sendCreditPurchaseNotification: mockSendCreditPurchaseNotificationFn,
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

// Mock BullMQ Worker and Redis
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

describe('EmailWorker', () => {
  let emailWorker: EmailWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    emailWorker = new EmailWorker();
  });

  describe('processJob', () => {
    it('should process license purchase notification job successfully', async () => {
      const licenseData: LicensePurchaseNotificationData = {
        emailType: 'license_purchase',
        userId: 1,
        licenseId: 100,
        licenseKey: 'ABC-123',
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        licenseTypeName: 'Professional',
        licenseTypeDescription: 'Professional License',
        licenseTypeMaxDomains: 5,
        stripeLicenseRecordId: 200,
      };

      const mockJob = {
        id: 'job-1',
        data: licenseData,
        attemptsMade: 0,
      } as unknown as Job<LicensePurchaseNotificationData>;

      mockSendLicensePurchaseNotification().mockResolvedValue(undefined);

      // Access private method for testing
      await (emailWorker as any).processJob(mockJob);

      expect(mockSendLicensePurchaseNotification()).toHaveBeenCalledWith(licenseData);
      expect(mockSendLicensePurchaseNotification()).toHaveBeenCalledTimes(1);
    });

    it('should process credit purchase notification job successfully', async () => {
      const creditData: CreditPurchaseNotificationData = {
        emailType: 'credit_purchase',
        userId: 2,
        licenseId: 200,
        creditAmount: 1000,
        transactionId: 300,
        customerEmail: 'customer2@example.com',
        purchaseTypeName: 'Standard Package',
        purchaseTypeDescription: 'Standard Credit Package',
        stripeCreditRecordId: 400,
      };

      const mockJob = {
        id: 'job-2',
        data: creditData,
        attemptsMade: 0,
      } as unknown as Job<CreditPurchaseNotificationData>;

      mockSendCreditPurchaseNotification().mockResolvedValue(undefined);

      await (emailWorker as any).processJob(mockJob);

      expect(mockSendCreditPurchaseNotification()).toHaveBeenCalledWith(creditData);
      expect(mockSendCreditPurchaseNotification()).toHaveBeenCalledTimes(1);
    });

    it('should throw error for unknown email type', async () => {
      const unknownData = {
        emailType: 'unknown_type',
        userId: 1,
        customerEmail: 'customer@example.com',
      };

      const mockJob = {
        id: 'job-3',
        data: unknownData,
        attemptsMade: 0,
      } as unknown as Job<any>;

      await expect(
        (emailWorker as any).processJob(mockJob)
      ).rejects.toThrow(EmailWorkerError);

      await expect(
        (emailWorker as any).processJob(mockJob)
      ).rejects.toThrow('Unknown email type: unknown_type');
    });

    it('should handle errors from EmailService for license purchase', async () => {
      const licenseData: LicensePurchaseNotificationData = {
        emailType: 'license_purchase',
        userId: 1,
        licenseId: 100,
        licenseKey: 'ABC-123',
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        licenseTypeName: 'Professional',
        licenseTypeDescription: 'Professional License',
        licenseTypeMaxDomains: 5,
        stripeLicenseRecordId: 200,
      };

      const mockJob = {
        id: 'job-4',
        data: licenseData,
        attemptsMade: 0,
      } as unknown as Job<LicensePurchaseNotificationData>;

      const emailError = new EmailWorkerError('EMAIL_ERROR', 'Failed to send email');
      mockSendLicensePurchaseNotification().mockRejectedValue(emailError);

      await expect(
        (emailWorker as any).processJob(mockJob)
      ).rejects.toThrow(EmailWorkerError);
    });

    it('should handle errors from EmailService for credit purchase', async () => {
      const creditData: CreditPurchaseNotificationData = {
        emailType: 'credit_purchase',
        userId: 2,
        licenseId: 200,
        creditAmount: 1000,
        transactionId: 300,
        customerEmail: 'customer2@example.com',
        purchaseTypeName: 'Standard Package',
        purchaseTypeDescription: 'Standard Credit Package',
        stripeCreditRecordId: 400,
      };

      const mockJob = {
        id: 'job-5',
        data: creditData,
        attemptsMade: 0,
      } as unknown as Job<CreditPurchaseNotificationData>;

      const emailError = new EmailWorkerError('EMAIL_ERROR', 'Failed to send email');
      mockSendCreditPurchaseNotification().mockRejectedValue(emailError);

      await expect(
        (emailWorker as any).processJob(mockJob)
      ).rejects.toThrow(EmailWorkerError);
    });

    it('should handle non-Error exceptions', async () => {
      const licenseData: LicensePurchaseNotificationData = {
        emailType: 'license_purchase',
        userId: 1,
        licenseId: 100,
        licenseKey: 'ABC-123',
        customerEmail: 'customer@example.com',
        customerName: 'John Doe',
        licenseTypeName: 'Professional',
        licenseTypeDescription: 'Professional License',
        licenseTypeMaxDomains: 5,
        stripeLicenseRecordId: 200,
      };

      const mockJob = {
        id: 'job-6',
        data: licenseData,
        attemptsMade: 0,
      } as unknown as Job<LicensePurchaseNotificationData>;

      mockSendLicensePurchaseNotification().mockRejectedValue('String error');

      await expect(
        (emailWorker as any).processJob(mockJob)
      ).rejects.toThrow();
    });
  });

  describe('setupEventHandlers', () => {
    it('should setup event handlers when worker is initialized', () => {
      const mockOn = vi.fn();
      const mockWorker = { on: mockOn };
      (emailWorker as any).worker = mockWorker;

      (emailWorker as any).setupEventHandlers();

      expect(mockOn).toHaveBeenCalled();
    });

    it('should not setup event handlers when worker is not initialized', () => {
      (emailWorker as any).worker = undefined;

      expect(() => {
        (emailWorker as any).setupEventHandlers();
      }).not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should shutdown worker and redis gracefully', async () => {
      const mockWorkerClose = vi.fn().mockResolvedValue(undefined);
      const mockRedisQuit = vi.fn().mockResolvedValue('OK');

      (emailWorker as any).worker = { close: mockWorkerClose };
      (emailWorker as any).redis = { quit: mockRedisQuit };

      await emailWorker.shutdown();

      expect(mockWorkerClose).toHaveBeenCalledTimes(1);
      expect(mockRedisQuit).toHaveBeenCalledTimes(1);
    });

    it('should handle shutdown when worker is not initialized', async () => {
      (emailWorker as any).worker = undefined;
      (emailWorker as any).redis = undefined;

      await expect(emailWorker.shutdown()).resolves.not.toThrow();
    });

    it('should handle shutdown when only worker is initialized', async () => {
      const mockWorkerClose = vi.fn().mockResolvedValue(undefined);
      (emailWorker as any).worker = { close: mockWorkerClose };
      (emailWorker as any).redis = undefined;

      await emailWorker.shutdown();

      expect(mockWorkerClose).toHaveBeenCalledTimes(1);
    });

    it('should handle shutdown when only redis is initialized', async () => {
      const mockRedisQuit = vi.fn().mockResolvedValue('OK');
      (emailWorker as any).worker = undefined;
      (emailWorker as any).redis = { quit: mockRedisQuit };

      await emailWorker.shutdown();

      expect(mockRedisQuit).toHaveBeenCalledTimes(1);
    });

    it('should handle shutdown errors', async () => {
      const mockWorkerClose = vi.fn().mockRejectedValue(new Error('Close failed'));
      (emailWorker as any).worker = { close: mockWorkerClose };
      (emailWorker as any).redis = undefined;

      await expect(emailWorker.shutdown()).rejects.toThrow();
    });

    it('should handle non-Error exceptions during shutdown', async () => {
      const mockWorkerClose = vi.fn().mockRejectedValue('String error');
      (emailWorker as any).worker = { close: mockWorkerClose };
      (emailWorker as any).redis = undefined;

      await expect(emailWorker.shutdown()).rejects.toThrow();
    });
  });
});

