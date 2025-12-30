# System Architecture - AFLWP Email Worker

## 📋 Table of Contents

- [Overview](#overview)
- [Architectural Principles](#architectural-principles)
- [Project Structure](#project-structure)
- [Architecture Patterns](#architecture-patterns)
- [Error Handling Architecture](#error-handling-architecture)
- [Email Service Architecture](#email-service-architecture)
- [Template System Architecture](#template-system-architecture)
- [Queue Processing Architecture](#queue-processing-architecture)
- [Configuration Architecture](#configuration-architecture)
- [Logging Architecture](#logging-architecture)
- [Testing Architecture](#testing-architecture)
- [Best Practices](#best-practices)

## 🔍 Overview

The AFLWP Email Worker follows a clean, modular architecture with clear separation of concerns. It implements modern Node.js/TypeScript patterns with comprehensive error handling, service-based architecture, and queue-based processing. The system is built around a queue-based email notification system that processes jobs asynchronously.

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│            AFLWP Email Worker Architecture                   │
├─────────────────────────────────────────────────────────────┤
│  Queue Processing Layer (BullMQ)                            │
│  ├── Job Queue (Redis)                                       │
│  ├── Worker Processing                                       │
│  └── Result Storage                                          │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (Email & Template Services)                  │
│  ├── Email Service (Nodemailer)                             │
│  └── Template Service (Handlebars)                          │
├─────────────────────────────────────────────────────────────┤
│  Error Handling Layer (Structured Errors)                   │
│  ├── EmailWorkerError (Custom Error Class)                  │
│  └── Error Types (Standardized Codes)                        │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer (Redis, Logging)                      │
│  ├── Redis Connection (Queue & Storage)                     │
│  └── Logging System (Pino)                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Architectural Principles

### Core Principles

- **Queue-Based Processing**: Asynchronous job processing using BullMQ and Redis
- **Service-Oriented**: Clear separation between email and template services
- **Error-First Design**: Comprehensive error handling with structured errors
- **Type Safety**: Full TypeScript coverage with strict typing
- **Separation of Concerns**: Clear boundaries between queue, services, and infrastructure
- **Testability**: Modular design enabling comprehensive unit and integration testing
- **Scalability**: Horizontal scaling through multiple worker instances

### Service System Principles

- **Service-Based**: Email and template operations separated into services
- **Template Caching**: Templates cached for performance
- **Dual Recipients**: Sends emails to both admin and customers
- **Error Handling**: Consistent error handling across all services

## 📁 Project Structure

```
source/
├── api/v1/                    # API v1 (error handling)
│   └── errors.ts              # Error handling system
│       ├── EmailWorkerError   # Custom error class
│       └── errorTypes         # Error type definitions
├── services/                  # Service modules
│   ├── emailService.ts        # Email sending service
│   └── emailTemplateService.ts # Template rendering service
├── templates/                 # Email templates (Handlebars)
│   ├── admin-license-purchase-notification.html
│   ├── customer-license-purchase-notification.html
│   ├── admin-credit-purchase-notification.html
│   └── customer-credit-purchase-notification.html
├── types/                     # TypeScript type definitions
│   └── emailJobs.ts           # Email job type definitions
├── utils/                     # Utility modules
│   └── logger.ts              # Logging utility
├── config.ts                  # Configuration management
├── emailWorker.ts             # EmailWorker class implementation
└── server.ts                  # Application entrypoint
```

### Directory Responsibilities

#### Error Handling (`/api/v1/errors.ts`)

- **Purpose**: Structured error handling system
- **Responsibilities**:
  - Custom error class (`EmailWorkerError`)
  - Error type definitions (`errorTypes`)
- **Pattern**: Centralized error handling with type safety

#### Services (`/services/`)

- **Purpose**: Business logic services
- **Responsibilities**:
  - Email sending (`EmailService`)
  - Template rendering (`EmailTemplateService`)
- **Pattern**: Service-based architecture with separation of concerns

#### Templates (`/templates/`)

- **Purpose**: Email HTML templates
- **Responsibilities**:
  - Admin notification templates
  - Customer notification templates
- **Pattern**: Handlebars-based templates with variable substitution

#### Types (`/types/`)

- **Purpose**: TypeScript type definitions
- **Responsibilities**:
  - Job data structures (`EmailNotificationJobData`, `LicensePurchaseNotificationData`, `CreditPurchaseNotificationData`)
- **Pattern**: Centralized type definitions

#### Utils (`/utils/`)

- **Purpose**: Utility functions
- **Responsibilities**:
  - Logging (`logger.ts`)
- **Pattern**: Reusable utility functions

## 🏗️ Architecture Patterns

### Service Pattern

The Email Worker uses a service-based architecture:

```typescript
// Email service for sending emails
class EmailService {
  static async sendLicensePurchaseNotification(
    data: LicensePurchaseNotificationData
  ): Promise<void>;
  static async sendCreditPurchaseNotification(
    data: CreditPurchaseNotificationData
  ): Promise<void>;
}

// Template service for rendering templates
class EmailTemplateService {
  static async renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): Promise<string>;
  static async loadTemplate(
    templateName: string
  ): Promise<HandlebarsTemplateDelegate>;
}
```

**Benefits:**

- Clear separation of concerns
- Easy to test services independently
- Reusable service methods
- Consistent error handling

### Queue Processing Pattern

Jobs are processed asynchronously using BullMQ:

```typescript
// Job processing flow
1. API creates job → Redis (BullMQ)
2. Worker picks up job → Processes with services
3. Services send emails → Worker stores result in Redis
4. API retrieves result → Job marked complete
```

**Benefits:**

- Asynchronous processing
- Scalable (multiple workers)
- Reliable (retry logic)
- Monitorable (job status tracking)

### Error Handling Pattern

Structured error handling with `EmailWorkerError`:

```typescript
// Error types
throw new EmailWorkerError('VALIDATION_ERROR', 'Invalid email type');
throw new EmailWorkerError('EMAIL_ERROR', 'SMTP connection failed', {
  error: err.message,
});
throw new EmailWorkerError('TEMPLATE_ERROR', 'Template not found');
```

**Benefits:**

- Consistent error structure
- Type-safe error handling
- Detailed error context
- Easy error categorization

## 🔧 Error Handling Architecture

### Error System Structure

```
┌─────────────────────────────────────┐
│      Error Handling System          │
├─────────────────────────────────────┤
│  EmailWorkerError                   │
│  ├── code: string                   │
│  ├── message: string                │
│  └── details?: any                  │
├─────────────────────────────────────┤
│  errorTypes                         │
│  ├── REDIS_ERROR                    │
│  ├── EMAIL_ERROR                    │
│  ├── TEMPLATE_ERROR                 │
│  ├── VALIDATION_ERROR               │
│  └── INTERNAL_SERVER                │
└─────────────────────────────────────┘
```

### Error Flow

1. **Error Occurrence**: Error detected in code
2. **Error Creation**: Create `EmailWorkerError` with appropriate type
3. **Error Logging**: Log error with context
4. **Error Handling**: Handle error appropriately (retry, fail, etc.)
5. **Error Reporting**: Report error in job result

## 📧 Email Service Architecture

### Email Service Structure

```typescript
class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter;
  public static async sendLicensePurchaseNotification(
    data: LicensePurchaseNotificationData
  ): Promise<void>;
  public static async sendCreditPurchaseNotification(
    data: CreditPurchaseNotificationData
  ): Promise<void>;
}
```

### Email Flow

1. **Job Data**: Worker receives job with email notification data
2. **Template Rendering**: Template service renders HTML from template
3. **Email Sending**: Email service sends email via Nodemailer
4. **Dual Recipients**: Sends to both admin and customer
5. **Logging**: Logs email sending status

### Email Types

- **License Purchase**: Notifications for license purchases
  - Admin notification with customer and license details
  - Customer notification with license key and details
- **Credit Purchase**: Notifications for credit purchases
  - Admin notification with customer and credit details
  - Customer notification with credit amount and details

## 🎨 Template System Architecture

### Template Service Structure

```typescript
class EmailTemplateService {
  private static templateCache: Map<string, HandlebarsTemplateDelegate>;

  public static async loadTemplate(
    templateName: string
  ): Promise<HandlebarsTemplateDelegate>;
  public static async renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): Promise<string>;
  public static clearCache(): void;
}
```

### Template Flow

1. **Template Request**: Service requests template by name
2. **Cache Check**: Check if template is cached
3. **Template Loading**: Load template from filesystem if not cached
4. **Template Compilation**: Compile Handlebars template
5. **Template Caching**: Cache compiled template
6. **Template Rendering**: Render template with data
7. **HTML Output**: Return rendered HTML

### Template Features

- **Handlebars**: Variable substitution and templating
- **Caching**: Compiled templates cached for performance
- **Timestamp**: Automatic timestamp injection
- **Admin/Customer**: Separate templates for admin and customer

## 📦 Queue Processing Architecture

### Queue Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  AFLWP API  │─────►│    Redis    │─────►│Email Worker │
│ (Job Creator)│      │  (BullMQ)   │      │ (Processor) │
└─────────────┘      └─────────────┘      └─────────────┘
                            │                      │
                            │                      ▼
                            │              ┌─────────────┐
                            │              │   Services  │
                            │              │ (Email,     │
                            │              │  Template)  │
                            │              └─────────────┘
                            │                      │
                            │                      ▼
                            └───────────────── Result
```

### Job Processing Steps

1. **Job Creation**: API creates job with `EmailNotificationJobData`
2. **Queue Addition**: Job added to Redis queue (BullMQ)
3. **Worker Pickup**: Worker picks up job from queue
4. **Email Type Detection**: Worker determines email type (license or credit)
5. **Template Rendering**: Template service renders appropriate template
6. **Email Sending**: Email service sends emails to admin and customer
7. **Result Storage**: Result stored in Redis
8. **Job Completion**: Job marked as completed
9. **Result Retrieval**: API retrieves result from Redis

## ⚙️ Configuration Architecture

### Configuration Structure

```typescript
// Redis configuration
export const redisConfig = {
  host: string;
  port: number;
  password: string;
  db: number;
};

// SMTP configuration
export const emailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  adminEmail: string;
};

// Application configuration
export const appConfig = {
  packageVersion: string;
  nodeEnvironment: string;
  debugEnabled: boolean;
};
```

### Configuration Flow

1. **Environment Variables**: Loaded from `.env` files
2. **Validation**: Required variables validated at startup
3. **Configuration Objects**: Exported as typed objects
4. **Usage**: Used throughout application

## 📊 Logging Architecture

### Logging System

- **Library**: Pino (high-performance logger)
- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Silent (test), Info, Warn, Error
- **Context**: Includes job IDs, email types, etc.
- **Multi-replica Support**: Each container replica writes to its own log files using the container hostname (obtained via `os.hostname()`), preventing conflicts when scaling services

### Logging Flow

1. **Log Creation**: Logger called with context
2. **Log Formatting**: Structured JSON format
3. **Log Output**: Console (development) or file (production)
   - **Production files**: `/app/logs/{service-name}-{container-hostname}-combined.log` and `/app/logs/{service-name}-{container-hostname}-error.log`
   - Example: `aflwp-email-worker-aflwp-control-prod-email-worker-1-combined.log` (replica 1), `aflwp-email-worker-aflwp-control-prod-email-worker-2-combined.log` (replica 2)
4. **Log Monitoring**: Logs monitored for errors/issues

### Container Hostname Detection

The logger uses `os.hostname()` to obtain the container hostname. When `hostname` is not explicitly set in docker-compose.yml, Docker automatically sets the hostname to the container name generated by Docker Compose. This is essential because:

- Docker Compose generates unique container names when `container_name` is not explicitly set (required for scaling)
- Each scaled replica gets its own unique hostname (e.g., `aflwp-control-prod-email-worker-1`, `aflwp-control-prod-email-worker-2`)
- Using `os.hostname()` ensures each replica writes to its own log files, enabling proper log aggregation
- The log file format includes both service name and container hostname for better identification

## 🧪 Testing Architecture

### Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── services/           # Service tests
│   ├── utils/              # Utility tests
│   ├── config.test.ts      # Configuration tests
│   └── emailWorker.test.ts # Worker tests
├── setup/                   # Test setup
│   └── mocks.ts            # Global mocks
└── mocks/                   # Centralized mocks
    ├── infra/              # Infrastructure mocks
    └── services/           # Service mocks
```

### Testing Strategy

- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **Mock Strategy**: Centralized mocks for external dependencies
- **Coverage**: Aim for high test coverage

## ✅ Best Practices

### Code Organization

- **Separation of Concerns**: Clear boundaries between layers
- **Single Responsibility**: Each module has one responsibility
- **DRY Principle**: Avoid code duplication
- **Type Safety**: Use TypeScript types throughout

### Error Handling

- **Structured Errors**: Always use `EmailWorkerError`
- **Error Context**: Include relevant details
- **Error Logging**: Log errors with context
- **Graceful Degradation**: Handle errors gracefully

### Service Development

- **Service Separation**: Keep email and template services separate
- **Template Caching**: Cache templates for performance
- **Error Handling**: Handle service-specific errors
- **Testing**: Write comprehensive tests

### Queue Processing

- **Idempotency**: Ensure job processing is idempotent
- **Retry Logic**: Implement retry for transient errors
- **Monitoring**: Monitor job processing metrics
- **Scaling**: Design for horizontal scaling

### Email Sending

- **Dual Recipients**: Always send to both admin and customer
- **Template Consistency**: Use consistent templates
- **Error Recovery**: Handle SMTP errors gracefully
- **Rate Limiting**: Be aware of SMTP provider rate limits
