# AFLWP Email Worker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-20+-blue.svg)](https://www.docker.com/)

AFLWP Email Worker is a background processing service that handles email notifications for the [AFLWP (Affiliate Links WordPress Plugin)](https://www.aflwp.com) ecosystem. This worker processes email notification jobs from a Redis queue using BullMQ and sends transactional emails for license purchases and credit purchases.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Docker Orchestration](#-docker-orchestration-with-makefile) (Makefile System)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 📧 Email Processing

- **Queue-based Processing** using Redis and BullMQ
- **Email Notifications** for license purchases and credit purchases
- **Template System** with Handlebars-based email templates
- **Dual Recipients** sends emails to both admin and customers
- **Template Caching** for improved performance
- **Error Handling** with detailed logging and monitoring

### 🔄 Job Management

- **Asynchronous Processing** for email operations
- **Job Status Tracking** with success/failure states
- **Result Storage** in Redis for API retrieval
- **Concurrent Processing** with configurable worker limits
- **Automatic Retry Logic** with configurable attempts

### 🛡️ Reliability & Monitoring

- **Health Checks** for container monitoring
- **Graceful Shutdown** handling
- **Comprehensive Logging** with structured output
- **Error Recovery** with automatic retry mechanisms

### 🐳 Container Support

- **Docker Support** with multi-platform compatibility
- **Multi-stage Dockerfile** with `node:lts-alpine3.23` for optimized builds
- **Docker Compose** configurations with development and production stages
- **Internal Network** configuration for enhanced security
- **Production Ready** with security best practices
- **Environment Configuration** with flexible setup (development/production)
- **UID/GID Standardization** (2000) for consistent permissions

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AFLWP API     │    │   Redis         │    │  Email Worker   │
│   (Job Creator) │◄──►│   (BullMQ)      │◄──►│   (Processor)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   SMTP Server    │
                                              │   (Nodemailer)   │
                                              └─────────────────┘
```

### Worker Flow

```
1. AFLWP API → Creates email job → Redis (BullMQ)
2. Email Worker → Picks up job from Redis → Determines email type
3. Template Service → Renders email template → Returns HTML
4. Email Service → Sends email via SMTP → Sends to admin and customer
5. Email Worker → Stores result in Redis → BullMQ marks job completed
6. AFLWP API → Retrieves result from Redis
```

### Docker Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host                              │
│                                                             │
│  ┌─────────────────┐                                       │
│  │  Email Worker   │                                       │
│  │   Container     │                                       │
│  │                 │                                       │
│  └─────────────────┘                                       │
│                                                             │
│                                  │                          │
│                                  ▼                          │
│                         ┌─────────────────────────────┐     │
│                         │   AFLWP API (with Redis)    │     │
│                         │   (External compose stack)   │     │
│                         └─────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Technologies

### Core Technologies

- **Node.js** - JavaScript runtime
- **TypeScript** - Typed programming language
- **BullMQ** - Redis-based queue system
- **Redis** - In-memory data store

### Email Integration

- **Nodemailer** - SMTP email sending
- **Handlebars** - Email template rendering
- **Template System** - Cached template loading

### Development & Deployment

- **Docker** - Containerization
- **Docker Compose** - Container orchestration
- **Vitest** - Unit testing framework
- **SonarQube** - Code quality analysis

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **npm** or **yarn**
- **Docker** and **Docker Compose** (recommended)
- **Redis** server (managed by AFLWP API Docker Compose)
- **SMTP** server credentials

### Development Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/Lyndros/aflwp-email-worker.git
   cd aflwp-email-worker
   npm install
   ```

2. **Configure environment**

   ```bash
   cp env.example.development .env.development
   nano .env.development
   ```

   Set your SMTP credentials and other required values.

3. **Start with Docker (Recommended)**

   ```bash
   make dev
   ```

4. (Docker-only) The project is intended to be run with Docker and Docker Compose.

## 📖 Usage

### Available Scripts

```bash
# Development
npm run dev                 # Start in development mode (with tsx watch)
npm run start               # Start in production mode
npm run build               # Build TypeScript to JavaScript
```

**Note**: For orchestration commands (tests, Docker management, etc.), use the Makefile:

```bash
make help                   # Show all available commands
make dev                    # Start development environment
make prod                   # Start production environment
make down                   # Stop services
make clean                  # Stop services and remove volumes (DANGEROUS)
make logs                   # View Email Worker logs
make status                 # Show service status
make restart                # Restart services
```

### Job Processing

The worker processes jobs with the following structure:

```typescript
interface LicensePurchaseNotificationData {
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

interface CreditPurchaseNotificationData {
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

type EmailNotificationJobData =
  | LicensePurchaseNotificationData
  | CreditPurchaseNotificationData;
```

### Job Flow

1. **Job Creation**: AFLWP API creates an email notification job in Redis (BullMQ)
2. **Job Processing**: Worker picks up job from Redis and determines email type
3. **Template Rendering**: Template service renders appropriate email template with job data
4. **Email Sending**: Email service sends email to both admin and customer via SMTP
5. **Result Storage**: Worker logs result and BullMQ marks job as completed
6. **Result Retrieval**: AFLWP API retrieves the completed job result from Redis

## 🐳 Docker Support

### Docker Architecture

The project uses a multi-stage Docker build strategy with separate stages for development and production:

- **Builder Stage**: Compiles TypeScript and installs all dependencies
- **Development Stage**: Based on builder, includes dev dependencies and hot-reload support
- **Production Stage**: Minimal image with only production dependencies

### Docker Compose Configuration

The project includes optimized Docker Compose configurations:

#### **`scripts/docker/docker-compose.yml`** - Base Configuration

- **Email Worker only**: This compose defines only the Email Worker service
- **Redis provided by API compose**: Configure `REDIS_HOST` to point to the API's Redis
- **Networks**: Includes internal and backend networks for isolation
- **Compatibility**: Linux servers, Intel-based and ARM64 systems

#### **`scripts/docker/docker-compose.override.yml`** - Development Overrides

- **Volume Mounts**: Source code mounted for hot-reload
- **Command Override**: Uses `npm run dev` instead of `npm run start`
- **Node Modules**: Preserved from container to avoid overwriting

### Quick Start Examples

#### Using Makefile (Recommended)

```bash
# Development
make dev

# Production
make prod
```

#### Manual Docker Compose (Advanced)

```bash
# Development (with hot-reload)
BUILD_TARGET=development APP_ENV_FILE=../../.env.development \
  docker compose \
  -f scripts/docker/docker-compose.yml \
  -f scripts/docker/docker-compose.override.yml \
  -p aflwp-control \
  --env-file=.env.development \
  up -d --build

# Production
BUILD_TARGET=production APP_ENV_FILE=../../.env.production \
  docker compose \
  -f scripts/docker/docker-compose.yml \
  -p aflwp-control \
  --env-file=.env.production \
  up -d --build
```

## ⚙️ Configuration

### Environment Variables

| Variable         | Description                                    | Required                    |
| ---------------- | ---------------------------------------------- | --------------------------- |
| `REDIS_HOST`     | Redis server hostname                          | **Yes**                     |
| `REDIS_PORT`     | Redis server port                              | **Yes**                     |
| `REDIS_PASSWORD` | Redis password                                 | **Yes**                     |
| `REDIS_DB`       | Redis database number                          | **Yes**                     |
| `SMTP_HOST`      | SMTP server hostname                           | **Yes**                     |
| `SMTP_PORT`      | SMTP server port                               | **Yes**                     |
| `SMTP_SECURE`    | Use TLS/SSL (true for 465, false for 587)      | **Yes**                     |
| `SMTP_USER`      | SMTP username                                  | **Yes**                     |
| `SMTP_PASSWORD`  | SMTP password                                  | **Yes**                     |
| `SMTP_FROM`      | Email address to send from                     | **Yes**                     |
| `ADMIN_EMAIL`    | Admin email for notifications                  | **Yes**                     |
| `NODE_ENV`       | Node environment (development/production/test) | **Yes** (set in Dockerfile) |
| `ENABLE_DEBUG`   | Enable debug mode (true/false)                 | **Yes**                     |

### Example Configuration

```bash
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@aflwp.com
ADMIN_EMAIL=admin@aflwp.com

# Node Environment (set in Dockerfile, not in .env files)
# NODE_ENV=development  # or production

# Debug Mode
ENABLE_DEBUG=false
```

**Note**:

- All environment variables are required and must be defined in your `.env.development` or `.env.production` file.
- `NODE_ENV` is set in the Dockerfile, not in `.env` files. This is a best practice to separate build-time variables from runtime variables.
- No default values are provided in the Docker Compose configuration. The application will throw an error at startup if any required environment variable is missing.

## 🔄 CI/CD Pipeline

### Jenkins Multibranch Pipeline

The project includes a complete Jenkins multibranch pipeline configuration for automated testing and code quality analysis.

#### Features

- **Automatic Branch Discovery**: Scans all branches and pull requests
- **Unit Testing**: Runs comprehensive test suite with coverage
- **Code Quality**: SonarQube analysis for code quality and security
- **Artifact Publishing**: Coverage reports and build artifacts

#### Setup

```bash
# Navigate to Jenkins configuration
cd scripts/jenkins/
ls -la
```

#### Pipeline Stages

1. **Checkout**: Repository cloning
2. **Install Dependencies**: `npm install`
3. **Unit Tests**: `npm run tests:unit`
4. **SonarQube Analysis**: Code quality analysis

For detailed setup instructions, see the Jenkins configuration files in `scripts/jenkins/`.

## 🚀 Deployment

### Docker Deployment (Recommended)

1. **Configure environment**

   ```bash
   cp env.example.production .env.production
   nano .env.production
   ```

2. **Deploy with Makefile**

   ```bash
   make prod
   ```

3. **Monitor the worker**

   ```bash
   # View logs (use same commands as development)
   make logs

   # Check status
   make status
   ```

<!-- Local/manual deployment is intentionally omitted; use Docker/Docker Compose -->

## 📁 Project Structure

```
aflwp-email-worker/
├── source/                           # Source code
│   ├── api/v1/                       # API v1 (error handling)
│   │   └── errors.ts                 # Error handling system
│   ├── services/                     # Service modules
│   │   ├── emailService.ts           # Email sending service
│   │   └── emailTemplateService.ts  # Template rendering service
│   ├── templates/                    # Email templates (Handlebars)
│   │   ├── admin-license-purchase-notification.html
│   │   ├── customer-license-purchase-notification.html
│   │   ├── admin-credit-purchase-notification.html
│   │   └── customer-credit-purchase-notification.html
│   ├── types/                        # TypeScript type definitions
│   │   └── emailJobs.ts              # Email job type definitions
│   ├── utils/                        # Utility modules
│   │   └── logger.ts                 # Logging utility
│   ├── config.ts                     # Configuration management
│   ├── emailWorker.ts                # EmailWorker class implementation
│   └── server.ts                     # Application entrypoint
├── tests/                            # Test files
│   ├── unit/                         # Unit tests
│   │   ├── services/                 # Service tests
│   │   ├── utils/                     # Utility tests
│   │   ├── config.test.ts            # Configuration tests
│   │   └── emailWorker.test.ts       # Worker tests
│   ├── mocks/                        # Centralized mocks
│   │   ├── infra/                    # Infrastructure mocks
│   │   └── services/                  # Service mocks
│   └── setup/                        # Test setup files
│       └── mocks.ts                  # Global mock configuration
├── docs/                             # Documentation
│   ├── README.md                     # Documentation index
│   ├── CONFIGURATION.md              # Configuration guide
│   ├── DEVELOPMENT.md                # Development guide
│   ├── SYSTEM_ARCHITECTURE.md        # Architecture documentation
│   └── TESTING_GUIDE.md              # Testing guide
├── scripts/                          # Utility scripts
│   ├── docker/                       # Docker configuration
│   │   ├── email-worker/             # Email Worker Docker setup
│   │   │   └── dockerfile            # Dockerfile
│   │   ├── docker-compose.yml        # Docker Compose
│   │   └── docker-compose.override.yml # Development overrides
│   └── jenkins/                      # Jenkins pipeline configuration
│       └── jenkins-aflwp-email-worker-pipeline # Pipeline definition
├── env.example.development           # Development environment variables template
├── env.example.production            # Production environment variables template
├── .sonar-project.properties         # SonarQube configuration
├── tsconfig.json                     # TypeScript configuration
├── vitest.config.ts                  # Vitest main configuration
├── vitest.unit.config.ts             # Vitest unit test configuration
├── vitest.setup.ts                   # Vitest setup file
├── package.json                      # Dependencies & scripts
└── README.md                         # This file
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm run tests

# Run unit tests with coverage
npm run tests:unit
```

### Test Structure

```
tests/
├── unit/                            # Unit tests
│   ├── services/                    # Service tests
│   │   ├── emailService.test.ts
│   │   └── emailTemplateService.test.ts
│   ├── utils/                       # Utility tests
│   │   └── logger.test.ts           # Logger tests
│   ├── config.test.ts               # Configuration tests
│   └── emailWorker.test.ts          # Worker tests
├── setup/                           # Test setup files
│   └── mocks.ts                     # Global mock configuration
├── mocks/                           # Centralized mocks (WordPress plugin pattern)
│   ├── infra/                       # Infrastructure mocks
│   │   ├── bullmq.ts                # BullMQ mock
│   │   └── ioredis.ts               # Redis mock
│   └── services/                    # Service mocks
│       └── emailTemplateService.ts
```

For detailed testing information, see the [Testing Guide](./docs/TESTING_GUIDE.md).

## 📖 API Documentation

### Email Worker API

The Email Worker processes jobs from Redis using BullMQ and stores results back in Redis.

#### EmailWorker Class

```typescript
export class EmailWorker {
  constructor();
  public async start(): Promise<void>;
  public async shutdown(): Promise<void>;
}
```

**Note**: The EmailWorker class requires explicit initialization. After instantiating, call `start()` to begin processing jobs. The worker handles graceful shutdown automatically on SIGINT/SIGTERM signals via the `shutdown()` method.

#### Job Data Structures

**LicensePurchaseNotificationData** - License purchase notification data:

```typescript
interface LicensePurchaseNotificationData {
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
```

**CreditPurchaseNotificationData** - Credit purchase notification data:

```typescript
interface CreditPurchaseNotificationData {
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
```

**EmailNotificationJobData** - Union type for all email notification job data:

```typescript
type EmailNotificationJobData =
  | LicensePurchaseNotificationData
  | CreditPurchaseNotificationData;
```

### Service System API

#### EmailService

```typescript
export class EmailService {
  static async sendLicensePurchaseNotification(
    data: LicensePurchaseNotificationData
  ): Promise<void>;
  static async sendCreditPurchaseNotification(
    data: CreditPurchaseNotificationData
  ): Promise<void>;
}
```

#### EmailTemplateService

```typescript
export class EmailTemplateService {
  static async loadTemplate(
    templateName: string
  ): Promise<HandlebarsTemplateDelegate>;
  static async renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): Promise<string>;
  static clearCache(): void;
}
```

### Configuration API

```typescript
// Redis configuration
export const redisConfig = {
  host: string;      // Redis server hostname
  port: number;      // Redis server port
  password: string;  // Redis password
  db: number;        // Redis database number
};

// SMTP configuration
export const emailConfig = {
  host: string;      // SMTP server hostname
  port: number;      // SMTP server port
  secure: boolean;    // Use TLS/SSL
  user: string;       // SMTP username
  password: string;  // SMTP password
  from: string;       // Email address to send from
  adminEmail: string; // Admin email for notifications
};
```

### Usage Examples

#### Basic Worker Usage

```typescript
import { EmailWorker } from './emailWorker';

// Create worker instance
const worker = new EmailWorker();

// Start processing jobs (explicit initialization)
await worker.start();

// Worker now processes jobs from Redis queue
// Graceful shutdown is handled automatically on SIGINT/SIGTERM signals
```

#### Email Service Usage

```typescript
import { EmailService } from './services/emailService';

// Send license purchase notification
await EmailService.sendLicensePurchaseNotification({
  emailType: 'license_purchase',
  userId: 123,
  licenseId: 456,
  licenseKey: 'ABC-123-DEF',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  licenseTypeName: 'Professional',
  licenseTypeDescription: 'Professional License',
  licenseTypeMaxDomains: 5,
  stripeLicenseRecordId: 789,
});

// Send credit purchase notification
await EmailService.sendCreditPurchaseNotification({
  emailType: 'credit_purchase',
  userId: 123,
  licenseId: 456,
  creditAmount: 1000,
  transactionId: 789,
  customerEmail: 'customer@example.com',
  purchaseTypeName: 'Standard Package',
  purchaseTypeDescription: 'Standard Credit Package',
  stripeCreditRecordId: 101,
});
```

## 🛠️ Useful Commands

### 🎯 Docker Orchestration with Makefile

The project uses a Makefile-based orchestration system that simplifies Docker Compose operations and separates build-time variables from runtime variables. This approach provides a clean interface for managing development and production environments.

#### How It Works

The Makefile orchestrates Docker Compose commands with the following principles:

1. **Build-Time Variables**: `BUILD_TARGET` determines which Docker stage to build (`development` or `production`)
2. **Runtime Variables**: Environment files (`.env.development` or `.env.production`) provide runtime configuration
3. **Project Namespace**: All services run under the `aflwp-control` project namespace for easy management
4. **Development Overrides**: Development mode uses `docker-compose.override.yml` for hot-reload and volume mounting

#### Makefile Commands

```bash
# Start development environment
make dev

# Start production environment
make prod

# View logs
make logs                    # Email Worker logs

# Stop services
make down                    # Stop services
make clean                   # Stop and remove volumes (DANGEROUS)

# Restart services
make restart

# Check service status
make status                  # Show service status

# Show all commands
make help
```

For detailed information about manual Docker commands, see the [Development Guide](./docs/DEVELOPMENT.md).

## 🤝 Contributing

1. **Fork** the project
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Contribution Guidelines

- Follow existing code conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass
- Follow TypeScript best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

### Complete Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Documentation Index](./docs/README.md)** - Complete documentation overview
- **[Configuration Guide](./docs/CONFIGURATION.md)** - Configuration reference
- **[Development Guide](./docs/DEVELOPMENT.md)** - Development workflow and best practices
- **[System Architecture](./docs/SYSTEM_ARCHITECTURE.md)** - Architecture documentation
- **[Testing Guide](./docs/TESTING_GUIDE.md)** - Testing strategy and best practices

### Additional Resources

- **Docker Setup**: See `scripts/docker/` for Docker configuration details
- **Jenkins Pipeline**: See `scripts/jenkins/` for CI/CD configuration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Lyndros/aflwp-email-worker/issues)
- **Email**: hello@aflwp.com
- **Website**: [https://www.aflwp.com](https://www.aflwp.com)

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [BullMQ](https://docs.bullmq.io/) - Redis-based queue system
- [Nodemailer](https://nodemailer.com/) - Email sending
- [Handlebars](https://handlebarsjs.com/) - Template rendering
- [Docker](https://www.docker.com/) - Containers
- [Redis](https://redis.io/) - In-memory data store

---

**Developed with ❤️ by the AFLWP Team**
