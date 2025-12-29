/**
 * Email Worker Error Types
 * 
 * This module defines error types specific to the Email Worker.
 * These errors are used throughout the worker for consistent error handling.
 */

/**
 * Email Worker Error Class
 * 
 * Custom error class for Email Worker operations.
 * Similar to ApiError but without HTTP status codes since this is a worker service.
 */
export class EmailWorkerError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EmailWorkerError';
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error type definitions
 * 
 * These error types are used throughout the Email Worker for consistent error handling.
 */
export const errorTypes = {
  /** Internal server error */
  INTERNAL_SERVER: 'INTERNAL_SERVER',
  /** Validation error */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** Email sending error */
  EMAIL_ERROR: 'EMAIL_ERROR',
  /** Template rendering error */
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
} as const;






