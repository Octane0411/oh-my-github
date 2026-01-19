/**
 * Unit tests for Rate Limiter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../rate-limit';

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      limiter = new RateLimiter(5, 60000); // 5 requests per minute
    });

    it('should allow first request', () => {
      const result = limiter.checkLimit('test-ip');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfter).toBe(0);
    });

    it('should track request count', () => {
      limiter.checkLimit('test-ip');
      limiter.checkLimit('test-ip');
      const result = limiter.checkLimit('test-ip');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should allow up to max requests', () => {
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit('test-ip');
        expect(result.allowed).toBe(true);
      }

      expect(limiter.getCount('test-ip')).toBe(5);
    });

    it('should block after exceeding limit', () => {
      // Make 5 allowed requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('test-ip');
      }

      // 6th request should be blocked
      const result = limiter.checkLimit('test-ip');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after time window expires', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('test-ip');
      }

      // 6th is blocked
      expect(limiter.checkLimit('test-ip').allowed).toBe(false);

      // Fast-forward past window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      const result = limiter.checkLimit('test-ip');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track different identifiers separately', () => {
      limiter.checkLimit('ip-1');
      limiter.checkLimit('ip-1');
      limiter.checkLimit('ip-2');

      expect(limiter.getCount('ip-1')).toBe(2);
      expect(limiter.getCount('ip-2')).toBe(1);
    });

    it('should return correct retryAfter time', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('test-ip');
      }

      // Check blocked request
      const result1 = limiter.checkLimit('test-ip');
      expect(result1.retryAfter).toBe(60); // 60 seconds remaining

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      const result2 = limiter.checkLimit('test-ip');
      expect(result2.retryAfter).toBe(30); // 30 seconds remaining
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      limiter = new RateLimiter(100, 3600000); // 100 requests per hour
    });

    it('should auto-cleanup expired entries', () => {
      // Create entries
      limiter.checkLimit('ip-1');
      limiter.checkLimit('ip-2');
      limiter.checkLimit('ip-3');

      expect(limiter.getCount('ip-1')).toBe(1);
      expect(limiter.getCount('ip-2')).toBe(1);
      expect(limiter.getCount('ip-3')).toBe(1);

      // Fast-forward past cleanup interval (10 minutes) + window (1 hour)
      vi.advanceTimersByTime(61 * 60 * 1000);

      // Trigger cleanup by making a new request
      limiter.checkLimit('ip-4');

      // Old entries should be cleaned
      expect(limiter.getCount('ip-1')).toBe(0);
      expect(limiter.getCount('ip-2')).toBe(0);
      expect(limiter.getCount('ip-3')).toBe(0);
      expect(limiter.getCount('ip-4')).toBe(1);
    });

    it('should clear all limits', () => {
      limiter.checkLimit('ip-1');
      limiter.checkLimit('ip-2');

      limiter.clear();

      expect(limiter.getCount('ip-1')).toBe(0);
      expect(limiter.getCount('ip-2')).toBe(0);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      limiter = new RateLimiter(3, 60000); // 3 requests per minute
    });

    it('should handle rapid sequential requests', () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(limiter.checkLimit('test-ip'));
      }

      expect(results[0]?.allowed).toBe(true);
      expect(results[1]?.allowed).toBe(true);
      expect(results[2]?.allowed).toBe(true);
      expect(results[3]?.allowed).toBe(false);
      expect(results[4]?.allowed).toBe(false);
    });

    it('should handle requests at window boundary', () => {
      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        limiter.checkLimit('test-ip');
      }

      // Blocked
      expect(limiter.checkLimit('test-ip').allowed).toBe(false);

      // Advance to exactly window expiry
      vi.advanceTimersByTime(60000);

      // Should be allowed
      expect(limiter.checkLimit('test-ip').allowed).toBe(true);
    });

    it('should handle zero count identifiers', () => {
      const count = limiter.getCount('never-used-ip');
      expect(count).toBe(0);
    });

    it('should handle extremely high request counts', () => {
      const highLimiter = new RateLimiter(1000000, 60000);

      for (let i = 0; i < 1000; i++) {
        const result = highLimiter.checkLimit('test-ip');
        expect(result.allowed).toBe(true);
      }

      expect(highLimiter.getCount('test-ip')).toBe(1000);
    });
  });

  describe('configuration', () => {
    it('should accept custom maxRequests', () => {
      const customLimiter = new RateLimiter(10, 60000);

      for (let i = 0; i < 10; i++) {
        expect(customLimiter.checkLimit('test-ip').allowed).toBe(true);
      }

      expect(customLimiter.checkLimit('test-ip').allowed).toBe(false);
    });

    it('should accept custom window', () => {
      const customLimiter = new RateLimiter(5, 30000); // 30 seconds

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        customLimiter.checkLimit('test-ip');
      }

      // Blocked
      expect(customLimiter.checkLimit('test-ip').allowed).toBe(false);

      // Advance 31 seconds
      vi.advanceTimersByTime(31000);

      // Should be allowed
      expect(customLimiter.checkLimit('test-ip').allowed).toBe(true);
    });

    it('should use default values', () => {
      const defaultLimiter = new RateLimiter();

      // Default is 100 requests per hour
      for (let i = 0; i < 100; i++) {
        expect(defaultLimiter.checkLimit('test-ip').allowed).toBe(true);
      }

      expect(defaultLimiter.checkLimit('test-ip').allowed).toBe(false);
    });
  });
});
