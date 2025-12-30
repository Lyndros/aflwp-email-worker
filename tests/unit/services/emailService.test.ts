/**
 * EmailService Unit Tests
 *
 * Comprehensive unit tests for the EmailService class.
 * Tests cover all methods including success and error scenarios.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  LicensePurchaseNotificationData,
  CreditPurchaseNotificationData,
} from '@/types/emailJobs';

// Mock nodemailer - functions must be created inside factory
vi.mock('nodemailer', () => {
  const mockSendMailFn = vi.fn();
  const mockCreateTransportFn = vi.fn(() => ({
    sendMail: mockSendMailFn,
  }));

  // Store references for use in tests
  (globalThis as any).__mockSendMail = mockSendMailFn;
  (globalThis as any).__mockCreateTransport = mockCreateTransportFn;

  return {
    default: {
      createTransport: mockCreateTransportFn,
    },
  };
});

// Mock EmailTemplateService - function must be created inside factory
vi.mock('@/services/emailTemplateService', () => {
  const mockRenderTemplateFn = vi.fn();

  // Store reference for use in tests
  (globalThis as any).__mockRenderTemplate = mockRenderTemplateFn;

  return {
    EmailTemplateService: {
      renderTemplate: mockRenderTemplateFn,
      loadTemplate: vi.fn(),
      clearCache: vi.fn(),
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

// Mock config
vi.mock('@/config', () => ({
  emailConfig: {
    host: 'test-smtp.example.com',
    port: 587,
    secure: false,
    user: 'test_user',
    password: 'test_password',
    from: 'test@example.com',
    adminEmail: 'admin@example.com',
  },
}));

// Import after mocks
import { EmailService } from '@/services/emailService';
import { EmailWorkerError } from '@/api/v1/errors';

// Get mock functions from global scope
const mockSendMail = () => (globalThis as any).__mockSendMail;
const mockCreateTransport = () => (globalThis as any).__mockCreateTransport;
const mockRenderTemplate = () => (globalThis as any).__mockRenderTemplate;

describe('EmailService', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock responses
    mockSendMail().mockResolvedValue({ messageId: 'test-message-id' });
    mockRenderTemplate().mockResolvedValue('<html>Test HTML</html>');

    // Reset transporter singleton
    (EmailService as any).transporter = null;
  });

  describe('getTransporter', () => {
    it('should create a new transporter on first call', () => {
      EmailService['getTransporter']();

      expect(mockCreateTransport()).toHaveBeenCalledTimes(1);
      expect(mockCreateTransport()).toHaveBeenCalledWith({
        host: 'test-smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test_user',
          pass: 'test_password',
        },
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
      });
    });

    it('should reuse the same transporter on subsequent calls', () => {
      const transporter1 = EmailService['getTransporter']();
      const transporter2 = EmailService['getTransporter']();

      expect(mockCreateTransport()).toHaveBeenCalledTimes(1);
      expect(transporter1).toBe(transporter2);
    });
  });

  describe('sendLicensePurchaseNotification', () => {
    const licensePurchaseData: LicensePurchaseNotificationData = {
      emailType: 'license_purchase',
      userId: 1,
      licenseId: 100,
      licenseKey: 'ABC-123-DEF-456',
      customerEmail: 'customer@example.com',
      customerName: 'John Doe',
      licenseTypeName: 'Professional',
      licenseTypeDescription: 'Professional License',
      licenseTypeMaxDomains: 5,
      stripeLicenseRecordId: 200,
    };

    it('should send email to admin successfully', async () => {
      await EmailService.sendLicensePurchaseNotification(licensePurchaseData);

      expect(mockRenderTemplate()).toHaveBeenCalledWith(
        'admin-license-purchase-notification.html',
        {
          customerName: 'John Doe',
          customerEmail: 'customer@example.com',
          licenseKey: 'ABC-123-DEF-456',
          licenseTypeName: 'Professional',
          licenseTypeDescription: 'Professional License',
          licenseTypeMaxDomains: 5,
        }
      );

      expect(mockSendMail()).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'admin@example.com',
        subject: 'New License Purchase: Professional',
        html: '<html>Test HTML</html>',
      });
    });

    it('should send email to customer successfully', async () => {
      await EmailService.sendLicensePurchaseNotification(licensePurchaseData);

      expect(mockRenderTemplate()).toHaveBeenCalledWith(
        'customer-license-purchase-notification.html',
        {
          customerName: 'John Doe',
          licenseKey: 'ABC-123-DEF-456',
          licenseTypeName: 'Professional',
          licenseTypeDescription: 'Professional License',
          licenseTypeMaxDomains: 5,
        }
      );

      expect(mockSendMail()).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'customer@example.com',
        subject: 'Your License is Ready: Professional',
        html: '<html>Test HTML</html>',
      });
    });

    it('should send both admin and customer emails', async () => {
      await EmailService.sendLicensePurchaseNotification(licensePurchaseData);

      expect(mockRenderTemplate()).toHaveBeenCalledTimes(2);
      expect(mockSendMail()).toHaveBeenCalledTimes(2);
    });

    it('should throw EmailWorkerError when template rendering fails for admin email', async () => {
      const templateError = new Error('Template not found');
      mockRenderTemplate().mockRejectedValueOnce(templateError);

      try {
        await EmailService.sendLicensePurchaseNotification(licensePurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: Template not found'
        );
      }
    });

    it('should throw EmailWorkerError when template rendering fails for customer email', async () => {
      const templateError = new Error('Template not found');
      mockRenderTemplate()
        .mockResolvedValueOnce('<html>Admin HTML</html>')
        .mockRejectedValueOnce(templateError);

      try {
        await EmailService.sendLicensePurchaseNotification(licensePurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: Template not found'
        );
      }
    });

    it('should throw EmailWorkerError when SMTP send fails for admin email', async () => {
      const smtpError = new Error('SMTP connection failed');
      mockSendMail().mockRejectedValueOnce(smtpError);

      try {
        await EmailService.sendLicensePurchaseNotification(licensePurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: SMTP connection failed'
        );
      }
    });

    it('should throw EmailWorkerError when SMTP send fails for customer email', async () => {
      const smtpError = new Error('SMTP connection failed');
      mockSendMail()
        .mockResolvedValueOnce({ messageId: 'admin-message-id' })
        .mockRejectedValueOnce(smtpError);

      try {
        await EmailService.sendLicensePurchaseNotification(licensePurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: SMTP connection failed'
        );
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockRenderTemplate().mockRejectedValueOnce('String error');

      try {
        await EmailService.sendLicensePurchaseNotification(licensePurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: Unknown error'
        );
      }
    });

    it('should use the same transporter instance for both emails', async () => {
      await EmailService.sendLicensePurchaseNotification(licensePurchaseData);

      expect(mockCreateTransport()).toHaveBeenCalledTimes(1);
      expect(mockSendMail()).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendCreditPurchaseNotification', () => {
    const creditPurchaseData: CreditPurchaseNotificationData = {
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

    it('should send email to admin successfully', async () => {
      await EmailService.sendCreditPurchaseNotification(creditPurchaseData);

      expect(mockRenderTemplate()).toHaveBeenCalledWith(
        'admin-credit-purchase-notification.html',
        {
          customerEmail: 'customer2@example.com',
          creditAmount: 1000,
          purchaseTypeName: 'Standard Package',
          purchaseTypeDescription: 'Standard Credit Package',
          transactionId: 300,
        }
      );

      expect(mockSendMail()).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'admin@example.com',
        subject: 'New Credit Purchase: Standard Package',
        html: '<html>Test HTML</html>',
      });
    });

    it('should send email to customer successfully', async () => {
      await EmailService.sendCreditPurchaseNotification(creditPurchaseData);

      expect(mockRenderTemplate()).toHaveBeenCalledWith(
        'customer-credit-purchase-notification.html',
        {
          creditAmount: 1000,
          purchaseTypeName: 'Standard Package',
          purchaseTypeDescription: 'Standard Credit Package',
          transactionId: 300,
        }
      );

      expect(mockSendMail()).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'customer2@example.com',
        subject: 'Thank You for Your Credit Purchase: Standard Package',
        html: '<html>Test HTML</html>',
      });
    });

    it('should send both admin and customer emails', async () => {
      await EmailService.sendCreditPurchaseNotification(creditPurchaseData);

      expect(mockRenderTemplate()).toHaveBeenCalledTimes(2);
      expect(mockSendMail()).toHaveBeenCalledTimes(2);
    });

    it('should throw EmailWorkerError when template rendering fails for admin email', async () => {
      const templateError = new Error('Template not found');
      mockRenderTemplate().mockRejectedValueOnce(templateError);

      try {
        await EmailService.sendCreditPurchaseNotification(creditPurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: Template not found'
        );
      }
    });

    it('should throw EmailWorkerError when template rendering fails for customer email', async () => {
      const templateError = new Error('Template not found');
      mockRenderTemplate()
        .mockResolvedValueOnce('<html>Admin HTML</html>')
        .mockRejectedValueOnce(templateError);

      try {
        await EmailService.sendCreditPurchaseNotification(creditPurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: Template not found'
        );
      }
    });

    it('should throw EmailWorkerError when SMTP send fails for admin email', async () => {
      const smtpError = new Error('SMTP connection failed');
      mockSendMail().mockRejectedValueOnce(smtpError);

      try {
        await EmailService.sendCreditPurchaseNotification(creditPurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: SMTP connection failed'
        );
      }
    });

    it('should throw EmailWorkerError when SMTP send fails for customer email', async () => {
      const smtpError = new Error('SMTP connection failed');
      mockSendMail()
        .mockResolvedValueOnce({ messageId: 'admin-message-id' })
        .mockRejectedValueOnce(smtpError);

      try {
        await EmailService.sendCreditPurchaseNotification(creditPurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: SMTP connection failed'
        );
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockRenderTemplate().mockRejectedValueOnce('String error');

      try {
        await EmailService.sendCreditPurchaseNotification(creditPurchaseData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailWorkerError);
        expect((error as EmailWorkerError).message).toBe(
          'Failed to send email: Unknown error'
        );
      }
    });

    it('should use the same transporter instance for both emails', async () => {
      await EmailService.sendCreditPurchaseNotification(creditPurchaseData);

      expect(mockCreateTransport()).toHaveBeenCalledTimes(1);
      expect(mockSendMail()).toHaveBeenCalledTimes(2);
    });
  });

  describe('transporter reuse across different email types', () => {
    it('should reuse transporter when sending different email types', async () => {
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

      await EmailService.sendLicensePurchaseNotification(licenseData);
      await EmailService.sendCreditPurchaseNotification(creditData);

      // Transporter should only be created once
      expect(mockCreateTransport()).toHaveBeenCalledTimes(1);
    });
  });
});
