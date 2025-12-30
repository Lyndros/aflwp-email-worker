# Configuration Guide - AFLWP Email Worker

## 📋 Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Redis Configuration](#redis-configuration)
- [SMTP Configuration](#smtp-configuration)
- [TypeScript Configuration](#typescript-configuration)
- [Vitest Testing Configuration](#vitest-testing-configuration)
- [Docker Configuration](#docker-configuration)
- [Jenkins CI/CD Configuration](#jenkins-cicd-configuration)
- [Best Practices](#best-practices)

## Overview

This document provides comprehensive configuration information for the AFLWP Email Worker project, including environment variables, Redis setup, SMTP configuration, TypeScript, testing, Docker, and CI/CD configurations. All configuration files work together to provide a robust development and deployment environment.

## Environment Variables

### Required Environment Variables

The following environment variables are **required** and must be set in your environment configuration:

#### Redis Configuration

| Variable         | Description           | Example                | Required |
| ---------------- | --------------------- | ---------------------- | -------- |
| `REDIS_HOST`     | Redis server hostname | `redis` or `localhost` | ✅ Yes   |
| `REDIS_PORT`     | Redis server port     | `6379`                 | ✅ Yes   |
| `REDIS_PASSWORD` | Redis password        | `your_password`        | ✅ Yes   |
| `REDIS_DB`       | Redis database number | `0`                    | ✅ Yes   |

**Note**:

- Redis is managed by the AFLWP API Docker Compose stack
- Configure `REDIS_HOST` to point to the API's Redis service
- In Docker Compose, use service name (e.g., `redis`) for `REDIS_HOST`
- For local development, use `localhost` if Redis runs locally

#### SMTP Configuration

| Variable        | Description                               | Example                | Required |
| --------------- | ----------------------------------------- | ---------------------- | -------- |
| `SMTP_HOST`     | SMTP server hostname                      | `smtp.gmail.com`       | ✅ Yes   |
| `SMTP_PORT`     | SMTP server port                          | `587` or `465`         | ✅ Yes   |
| `SMTP_SECURE`   | Use TLS/SSL (true for 465, false for 587) | `true` or `false`      | ✅ Yes   |
| `SMTP_USER`     | SMTP username                             | `your_email@gmail.com` | ✅ Yes   |
| `SMTP_PASSWORD` | SMTP password                             | `your_app_password`    | ✅ Yes   |
| `SMTP_FROM`     | Email address to send from                | `noreply@aflwp.com`    | ✅ Yes   |
| `ADMIN_EMAIL`   | Admin email for notifications             | `admin@aflwp.com`      | ✅ Yes   |

**Note**:

- `SMTP_SECURE=true` for port 465 (TLS)
- `SMTP_SECURE=false` for port 587 (STARTTLS)
- Use app-specific passwords for Gmail and similar services
- Store SMTP credentials securely (never commit to version control)

#### Node Environment Configuration

| Variable   | Description      | Example                                | Required |
| ---------- | ---------------- | -------------------------------------- | -------- |
| `NODE_ENV` | Node environment | `development`, `production`, or `test` | ✅ Yes   |

**Note**:

- Set in Dockerfile (build-time variable)
- Do NOT set in `.env` files
- Controls Node.js runtime behavior

#### Feature Flags

| Variable       | Description                      | Example           | Required |
| -------------- | -------------------------------- | ----------------- | -------- |
| `ENABLE_DEBUG` | Enable debug mode (console logs) | `true` or `false` | ✅ Yes   |

**Note**:

- `ENABLE_DEBUG=true`: Enables additional console logging
- `ENABLE_DEBUG=false`: Minimal logging (production default)
- Useful for debugging during development

### Build-Time vs Runtime Variables

**Important**: The project separates build-time variables (Docker build stages) from runtime variables (.env files):

- **Build-time variables**: Controlled by `BUILD_TARGET` environment variable (set by Makefile)
  - `BUILD_TARGET=development` → Uses `development` stage in Dockerfile
  - `BUILD_TARGET=production` → Uses `production` stage in Dockerfile

- **Runtime variables**: Defined in `.env.development` or `.env.production` files
  - These are used by Node.js when the container is running
  - Do NOT include `BUILD_TARGET` in `.env` files (it's a build-time variable only)

**Recommended**: Use the Makefile (`make dev`, `make prod`) which automatically sets `BUILD_TARGET` correctly.

### Environment Configuration Examples

#### Development

```env
# AFLWP Email Worker Environment Variables - Development
# Note: BUILD_TARGET is NOT included here - it's a build-time variable controlled by Makefile

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
# Redis is managed by the AFLWP API Docker Compose stack
# Use service name 'redis' when connecting from Docker Compose network
# Use 'localhost' when connecting from host machine
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# =============================================================================
# SMTP CONFIGURATION
# =============================================================================
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@aflwp.com
ADMIN_EMAIL=admin@aflwp.com

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_DEBUG=true
```

#### Production

```env
# AFLWP Email Worker Environment Variables - Production
# Note: BUILD_TARGET is NOT included here - it's a build-time variable controlled by Makefile

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_production_redis_password
REDIS_DB=0

# =============================================================================
# SMTP CONFIGURATION
# =============================================================================
SMTP_HOST=your_production_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_production_smtp_user
SMTP_PASSWORD=your_production_smtp_password
SMTP_FROM=noreply@aflwp.com
ADMIN_EMAIL=admin@aflwp.com

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_DEBUG=false
```

## Redis Configuration

### Redis Connection

The Email Worker connects to Redis for:

- **Job Queue**: BullMQ uses Redis for job queue management
- **Result Storage**: Job results stored in Redis for API retrieval

### Redis Setup

**Development**: Redis is managed by the AFLWP API Docker Compose stack. Configure `REDIS_HOST=redis` to connect to the API's Redis service.

**Production**: Configure `REDIS_HOST` to point to your production Redis instance.

### Redis Connection Configuration

```typescript
// Redis configuration (from config.ts)
export const redisConfig = {
  host: requireEnv('REDIS_HOST'),
  port: Number.parseInt(requireEnv('REDIS_PORT')),
  password: requireEnv('REDIS_PASSWORD'),
  db: Number.parseInt(requireEnv('REDIS_DB')),
};
```

## SMTP Configuration

### SMTP Connection

The Email Worker uses Nodemailer to send emails via SMTP:

- **Connection**: Configured with SMTP host, port, and credentials
- **Security**: Supports both TLS (port 465) and STARTTLS (port 587)
- **Timeouts**: Configured to avoid "Greeting never received" errors

### SMTP Setup

**Common SMTP Providers**:

- **Gmail**: `smtp.gmail.com`, port 587 (STARTTLS) or 465 (TLS)
- **SendGrid**: `smtp.sendgrid.net`, port 587
- **Mailgun**: `smtp.mailgun.org`, port 587
- **Custom SMTP**: Configure with your provider's settings

### SMTP Connection Configuration

```typescript
// SMTP configuration (from config.ts)
export const emailConfig = {
  host: requireEnv('SMTP_HOST'),
  port: Number.parseInt(requireEnv('SMTP_PORT')),
  secure: requireEnv('SMTP_SECURE') === 'true',
  user: requireEnv('SMTP_USER'),
  password: requireEnv('SMTP_PASSWORD'),
  from: requireEnv('SMTP_FROM'),
  adminEmail: requireEnv('ADMIN_EMAIL'),
};
```

### Nodemailer Transporter Configuration

```typescript
// Nodemailer transporter (from emailService.ts)
nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure, // true for 465, false for other ports
  auth: {
    user: emailConfig.user,
    pass: emailConfig.password,
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
});
```

## TypeScript Configuration

### tsconfig.json

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "module": "ES2022",
    "target": "ES2022",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "paths": {
      "@/*": ["source/*"],
      "@tests/*": ["tests/*"],
      "@mocks/*": ["tests/mocks/*"]
    }
  }
}
```

### Path Aliases

- `@/*`: Source code (`source/*`)
- `@tests/*`: Test files (`tests/*`)
- `@mocks/*`: Mock files (`tests/mocks/*`)

## Vitest Testing Configuration

### vitest.unit.config.ts

Unit test configuration with coverage:

```typescript
export default defineConfig({
  test: {
    name: 'unit',
    globals: true,
    environment: 'node',
    testMatch: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['source/**/*.ts'],
      exclude: ['tests/**', 'source/**/*.d.ts'],
    },
  },
});
```

### Test Setup

- **Setup File**: `vitest.setup.ts` - Environment variable setup
- **Mocks Setup**: `tests/setup/mocks.ts` - Global mock configuration
- **Mock Files**: `tests/mocks/infra/` - Auto-loaded mocks

## Docker Configuration

### Dockerfile

Multi-stage Docker build:

- **Builder Stage**: Compiles TypeScript and installs dependencies
- **Development Stage**: Includes dev dependencies and hot-reload
- **Production Stage**: Minimal image with only production dependencies

### Docker Compose

**Base Configuration** (`scripts/docker/docker-compose.yml`):

- Email Worker service definition
- Network configuration
- Volume mounts (production)

**Development Override** (`scripts/docker/docker-compose.override.yml`):

- Source code volume mount (hot-reload)
- Development command override
- Node modules preservation

### Docker Environment Variables

Docker Compose loads environment variables from `.env` files:

```yaml
services:
  email-worker:
    env_file:
      - ${APP_ENV_FILE} # Loads .env.development or .env.production
```

## Jenkins CI/CD Configuration

### Pipeline Structure

The Jenkins pipeline includes:

1. **Checkout**: Repository cloning
2. **Install Dependencies**: `npm install`
3. **Unit Tests**: `npm run tests:unit`
4. **SonarQube Analysis**: Code quality analysis

### Pipeline Configuration

Pipeline file: `scripts/jenkins/jenkins-aflwp-email-worker-pipeline`

**Features:**

- Automatic branch discovery
- Unit testing with coverage
- Code quality analysis
- Artifact publishing

## Best Practices

### Environment Variables

1. **Never Commit Secrets**: Never commit `.env` files with real secrets
2. **Use Templates**: Use `env.example.*` files as templates
3. **Validate Required**: Validate all required variables at startup
4. **Secure Storage**: Store production secrets securely (secrets manager, etc.)

### Configuration Management

1. **Single Source of Truth**: Environment variables are the single source of truth
2. **Type Safety**: Use TypeScript types for configuration objects
3. **Validation**: Validate configuration at startup
4. **Documentation**: Document all configuration options

### Docker Configuration

1. **Multi-Stage Builds**: Use multi-stage builds for smaller images
2. **Layer Caching**: Optimize Dockerfile for layer caching
3. **Security**: Use non-root user in containers
4. **Health Checks**: Include health checks for monitoring

### Testing Configuration

1. **Isolation**: Tests should be isolated and independent
2. **Mocks**: Use centralized mocks for external dependencies
3. **Coverage**: Aim for high test coverage
4. **CI Integration**: Run tests in CI/CD pipeline

### SMTP Configuration

1. **Use App Passwords**: Use app-specific passwords for Gmail and similar services
2. **Test Connection**: Test SMTP connection before deploying
3. **Monitor Failures**: Monitor email sending failures
4. **Rate Limiting**: Be aware of SMTP provider rate limits
