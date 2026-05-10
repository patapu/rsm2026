/**
 * Global vitest setup — runs before any test file is imported.
 * Sets required environment variables so modules that validate them at load time
 * don't throw during tests.
 */

process.env.FINGERPRINT_SECRET = 'test-secret-for-fingerprint-testing-purposes-ok-64'
process.env.REDIS_URL = 'redis://localhost:6379'
