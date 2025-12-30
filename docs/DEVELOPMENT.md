# Development Guide - AFLWP Email Worker

## 📋 Table of Contents

- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Code Conventions](#code-conventions)
- [Workflow](#workflow)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Makefile Command Reference](#makefile-command-reference)
- [Debugging](#debugging)
- [Deployment](#deployment)

## Environment Setup

### Prerequisites

- **Node.js** 20+
- **npm** or **yarn**
- **Git**
- **Docker** and **Docker Compose** (recommended)
- **Redis** server (managed by AFLWP API Docker Compose)
- **SMTP** server credentials

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "vitest.explorer"
  ]
}
```

### Initial Setup

**Important**: The development environment **always runs with Docker** because the Email Worker requires Redis. All development work is done inside Docker containers.

**📖 Build-Time vs Runtime Variables**: The project uses a Makefile to separate build-time variables (Docker build stages via `BUILD_TARGET`) from runtime variables (`.env` files). This is the recommended approach. The Makefile automatically sets `BUILD_TARGET` correctly for each environment.

**📖 Redis Connection**: The Email Worker connects to Redis managed by the AFLWP API Docker Compose stack. Configure `REDIS_HOST` to point to the API's Redis service.

**📖 Makefile Internals**: The Makefile passes `BUILD_TARGET` and `APP_ENV_FILE` as shell environment variables to Docker Compose, which uses them for build stages and environment file loading.

1. **Clone the repository**

   ```bash
   git clone https://github.com/Lyndros/aflwp-email-worker.git
   cd aflwp-email-worker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp env.example.development .env.development
   # Edit .env.development with your configurations
   # Note: REDIS_HOST should point to the API's Redis service
   # Note: Configure SMTP credentials
   ```

4. **Start development environment with Docker**

   ```bash
   make dev
   ```

   This command starts the Email Worker service using Docker Compose. The worker connects to Redis managed by the AFLWP API stack.

## Project Structure

```
aflwp-email-worker/
├── source/                          # Main source code
│   ├── api/v1/                      # API v1 (error handling)
│   │   └── errors.ts                # Error handling system
│   ├── services/                    # Service modules
│   │   ├── emailService.ts          # Email sending service
│   │   └── emailTemplateService.ts  # Template rendering service
│   ├── templates/                   # Email templates (Handlebars)
│   │   ├── admin-license-purchase-notification.html
│   │   ├── customer-license-purchase-notification.html
│   │   ├── admin-credit-purchase-notification.html
│   │   └── customer-credit-purchase-notification.html
│   ├── types/                       # TypeScript type definitions
│   │   └── emailJobs.ts             # Email job type definitions
│   ├── utils/                       # Utility modules
│   │   └── logger.ts                # Logging utility
│   ├── config.ts                    # Configuration management
│   ├── emailWorker.ts               # EmailWorker class implementation
│   └── server.ts                    # Application entrypoint
├── tests/                           # Test files
│   ├── unit/                        # Unit tests
│   │   ├── services/                # Service tests
│   │   ├── utils/                   # Utility tests
│   │   ├── config.test.ts           # Configuration tests
│   │   └── emailWorker.test.ts      # Worker tests
│   ├── mocks/                       # Centralized mocks
│   │   ├── infra/                   # Infrastructure mocks
│   │   └── services/                # Service mocks
│   └── setup/                       # Test setup files
│       └── mocks.ts                 # Global mock configuration
├── docs/                            # Documentation
│   ├── DEVELOPMENT.md                # This file
│   ├── SYSTEM_ARCHITECTURE.md       # Architecture documentation
│   ├── CONFIGURATION.md              # Configuration guide
│   └── TESTING_GUIDE.md              # Testing guide
├── scripts/                         # Utility scripts
│   ├── docker/                      # Docker configuration
│   │   ├── docker-compose.yml       # Docker Compose
│   │   └── docker-compose.override.yml # Development overrides
│   └── jenkins/                     # Jenkins pipeline configuration
│       └── jenkins-aflwp-email-worker-pipeline # Pipeline definition
├── env.example.development          # Development environment template
├── env.example.production           # Production environment template
├── vitest.unit.config.ts            # Vitest unit test configuration
├── vitest.setup.ts                  # Vitest setup file
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies & scripts
└── README.md                        # Main README
```

## Code Conventions

### Error Handling

The Email Worker uses a structured error handling system with `EmailWorkerError`:

```typescript
import { EmailWorkerError } from './api/v1/errors';

// Throw structured errors
throw new EmailWorkerError('VALIDATION_ERROR', 'Invalid email type');
throw new EmailWorkerError('EMAIL_ERROR', 'SMTP connection failed', {
  error: err.message,
});
throw new EmailWorkerError('TEMPLATE_ERROR', 'Template not found');
throw new EmailWorkerError('INTERNAL_SERVER'); // Uses default message
```

**Error Types:**

- `REDIS_ERROR`: Redis connection or operation errors
- `EMAIL_ERROR`: Email sending errors (SMTP, Nodemailer, etc.)
- `TEMPLATE_ERROR`: Template loading or rendering errors
- `VALIDATION_ERROR`: Configuration or input validation failures
- `INTERNAL_SERVER`: Unexpected worker errors

### TypeScript Conventions

- **Strict Type Checking**: All code uses strict TypeScript with `noImplicitAny` and `strictNullChecks`
- **Type Safety**: Full TypeScript coverage with proper typing
- **Interfaces**: Use interfaces for contracts (e.g., `EmailNotificationJobData`)
- **Type Exports**: Centralize type exports in `types/` directory

### Code Style

- **Naming**: Use camelCase for variables and functions, PascalCase for classes
- **File Naming**: Use kebab-case for file names (e.g., `email-worker.ts`)
- **Imports**: Group imports (external, internal, types)
- **Comments**: Use JSDoc for public APIs, avoid inline comments unless necessary

### Email Service Pattern

The Email Worker uses a service-based architecture:

```typescript
// Email service for sending emails
await EmailService.sendLicensePurchaseNotification(data);
await EmailService.sendCreditPurchaseNotification(data);

// Template service for rendering templates
const html = await EmailTemplateService.renderTemplate('template.html', data);
```

## Workflow

### Development Workflow

1. **Start Development Environment**

   ```bash
   make dev
   ```

2. **View Logs**

   ```bash
   make logs
   ```

3. **Run Tests**

   ```bash
   npm run tests:unit
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

### Code Changes

1. **Make Changes**: Edit source files in `source/`
2. **Hot Reload**: Changes are automatically reloaded in development mode
3. **Test Changes**: Run tests to verify functionality
4. **Check Logs**: Monitor logs for errors or issues

## Testing

### Running Tests

```bash
# Run all tests
npm run tests

# Run unit tests with coverage
npm run tests:unit
```

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Mock Strategy**: Use centralized mocks in `tests/mocks/`

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EmailService } from '@/services/emailService';

describe('EmailService', () => {
  it('should send license purchase notification', async () => {
    const data = {
      emailType: 'license_purchase',
      userId: 123,
      // ... other data
    };

    await EmailService.sendLicensePurchaseNotification(data);
    // Assert email was sent
  });
});
```

For detailed testing information, see the [Testing Guide](./TESTING_GUIDE.md).

## Error Handling

### Error System Architecture

The Email Worker uses a structured error handling system:

```
┌─────────────────────────────────────┐
│      Error Handling System          │
├─────────────────────────────────────┤
│  EmailWorkerError (Custom Error)    │
│  ├── code: string                   │
│  ├── message: string               │
│  └── details?: any                 │
├─────────────────────────────────────┤
│  errorTypes (Error Types)           │
│  ├── REDIS_ERROR                    │
│  ├── EMAIL_ERROR                    │
│  ├── TEMPLATE_ERROR                 │
│  ├── VALIDATION_ERROR               │
│  └── INTERNAL_SERVER                │
└─────────────────────────────────────┘
```

### Error Handling Best Practices

1. **Use Structured Errors**: Always use `EmailWorkerError` instead of generic `Error`
2. **Provide Context**: Include relevant details in error messages
3. **Log Errors**: Log errors with appropriate log levels
4. **Handle Gracefully**: Implement retry logic for transient errors

## Makefile Command Reference

### Development Commands

```bash
make dev          # Start development environment
make logs         # View Email Worker logs
make status       # Show service status
make restart      # Restart services
make down         # Stop services
make clean        # Stop services and remove volumes (DANGEROUS)
```

### Production Commands

```bash
make prod         # Start production environment
make logs         # View production logs
make status       # Show production status
```

## Debugging

### View Logs

```bash
# Development logs
make logs

# Follow logs in real-time
docker compose -f scripts/docker/docker-compose.yml \
  -f scripts/docker/docker-compose.override.yml \
  -p aflwp-control \
  --env-file=.env.development \
  logs -f email-worker
```

### Debug Mode

Enable debug mode in `.env.development`:

```env
ENABLE_DEBUG=true
```

This enables additional console logging for debugging.

### Common Issues

1. **Redis Connection Failed**
   - Check `REDIS_HOST` points to the correct Redis service
   - Verify Redis is running in the API Docker Compose stack
   - Check network connectivity

2. **SMTP Connection Errors**
   - Verify `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE` are correct
   - Check SMTP credentials are valid
   - Test SMTP connection outside of Docker
   - Review error logs for specific error messages

3. **Email Sending Failures**
   - Check SMTP provider rate limits
   - Verify email addresses are valid
   - Review template rendering errors
   - Check Nodemailer error logs

4. **Job Processing Issues**
   - Check BullMQ queue status
   - Verify job data structure matches `EmailNotificationJobData` interface
   - Review worker logs for processing errors

## Deployment

### Docker Deployment

1. **Configure Environment**

   ```bash
   cp env.example.production .env.production
   nano .env.production
   ```

2. **Deploy**

   ```bash
   make prod
   ```

3. **Monitor**
   ```bash
   make logs
   make status
   ```

For detailed deployment information, see the [Configuration Guide](./CONFIGURATION.md).
