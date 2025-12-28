/**
 * Vitest setup file for environment variables.
 *
 * We keep this deterministic and self-contained so unit tests do not depend on
 * a local `.env.development` file being present in CI.
 * 
 * This file also loads global mocks from the tests/mocks/infra/ directory.
 */

// Load global mocks before environment setup
import './tests/mocks/infra/bullmq';
import './tests/mocks/infra/ioredis';

// Environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_DEBUG = 'false';

process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test_redis_password';
process.env.REDIS_DB = '0';

process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test_smtp_user';
process.env.SMTP_PASSWORD = 'test_smtp_password';
process.env.SMTP_FROM = 'test@example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';





