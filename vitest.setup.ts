/**
 * Global vitest setup — runs before any test file is imported.
 * Sets required environment variables so modules that validate them at load time
 * don't throw during tests.
 */

process.env.FINGERPRINT_SECRET = 'test-secret-for-fingerprint-testing-purposes-ok-64'
process.env.REDIS_URL = 'redis://localhost:6379'

// Mock IntersectionObserver for framer-motion whileInView in jsdom
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
  } as unknown as typeof globalThis.IntersectionObserver;
}
