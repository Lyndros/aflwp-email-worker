# AFLWP Email Worker - Complete Documentation

## 📋 Overview

This document serves as the comprehensive documentation for the AFLWP Email Worker project. It provides a complete overview of the project's architecture, configuration, usage, and all documentation created for the project.

## 🚀 Project Overview

The AFLWP Email Worker is a background processing service that handles email notifications for the AFLWP (Affiliate Links WordPress Plugin) ecosystem. Built with TypeScript, BullMQ, Redis, and Nodemailer, it processes email notification jobs from a queue and sends transactional emails for license purchases and credit purchases.

### Key Features

- **Queue-based Processing**: Redis and BullMQ for reliable job processing
- **Email Notifications**: Sends notifications for license purchases and credit purchases
- **Template System**: Handlebars-based email templates with caching
- **Dual Recipients**: Sends emails to both admin and customers
- **Graceful Shutdown**: Proper cleanup and signal handling
- **Comprehensive Logging**: Structured logging with Pino
- **Testing**: Comprehensive unit testing with Vitest
- **Docker Support**: Containerized deployment with multi-stage builds
- **CI/CD**: Jenkins pipeline with automated testing and quality gates

## 📚 Documentation Summary

This project has been completely documented with comprehensive guides covering all aspects of development, deployment, and maintenance. The documentation includes:

### ✅ **Complete Coverage**

- **100% of source code** documented with JSDoc
- **All configurations** documented and explained
- **Complete infrastructure** setup guides
- **Comprehensive testing** strategy and best practices
- **Full deployment** and maintenance guides

### ✅ **Technical Improvements**

- **Standardized error handling** with proper error types
- **Comprehensive validation** system
- **Robust testing** with comprehensive unit tests
- **Production-ready** Docker configuration
- **Security best practices** implementation

## 📚 Documentation Index

### 🚀 Getting Started Guides

- **[Main README](../README.md)** - General project documentation with complete setup instructions

### 📖 Technical Documentation

- **[Configuration Guide](./CONFIGURATION.md)** - Complete configuration reference
- **[Development Guide](./DEVELOPMENT.md)** - Development workflow and best practices
- **[System Architecture](./SYSTEM_ARCHITECTURE.md)** - Architecture documentation
- **[Testing Guide](./TESTING_GUIDE.md)** - Testing strategy, test structure, and best practices

### 🔧 Additional Resources

- **[Docker Configuration](../scripts/docker/README.md)** - Docker setup and architecture (if available)
- **[Jenkins Pipeline](../scripts/jenkins/readme.txt)** - CI/CD configuration

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

1. **Job Creation**: AFLWP API creates an email notification job in Redis (BullMQ)
2. **Job Processing**: Worker picks up job from Redis and determines email type
3. **Template Rendering**: Worker renders appropriate email template with job data
4. **Email Sending**: Worker sends email to both admin and customer via SMTP
5. **Result Storage**: Worker logs result and BullMQ marks job as completed

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

## 📖 Quick Start

### Prerequisites

- **Node.js** 20+
- **npm** or **yarn**
- **Docker** and **Docker Compose** (recommended)
- **Redis** server
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
├── unit/                        # Unit tests
│   ├── services/               # Service tests
│   ├── utils/                   # Utility tests
│   │   └── logger.test.ts       # Logger tests
│   ├── config.test.ts           # Configuration tests
│   └── emailWorker.test.ts      # Worker tests
├── mocks/                       # Centralized mocks
│   ├── infra/                   # Infrastructure mocks
│   └── services/                # Service mocks
└── setup/                       # Test setup files
```

## 📚 Additional Resources

- **[Docker Setup](../scripts/docker/README.md)** - Docker configuration details
- **[Jenkins Pipeline](../scripts/jenkins/readme.txt)** - CI/CD configuration

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

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Lyndros/aflwp-email-worker/issues)
- **Email**: hello@aflwp.com
- **Website**: [https://www.aflwp.com](https://www.aflwp.com)

---

**Developed with ❤️ by the AFLWP Team**
