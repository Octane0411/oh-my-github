/**
 * Rate Limiting
 *
 * Simple in-memory rate limiter for API endpoints.
 * For production, this should be replaced with Redis-based rate limiting.
 */

import type { RateLimitStatus } from "../agents/coordinator/types";

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private maxRequests: number;
  private windowMs: number;

  /**
   * Create a rate limiter
   *
   * @param maxRequests - Maximum requests per window
   * @param windowMs - Time window in milliseconds
   */
  constructor(maxRequests: number = 100, windowMs: number = 3600000) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Auto-cleanup every 10 minutes
    setInterval(() => this.cleanup(), 600000);
  }

  /**
   * Check if a request is allowed
   *
   * @param identifier - Unique identifier (e.g., IP address)
   * @returns Rate limit status
   */
  checkLimit(identifier: string): RateLimitStatus {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // No entry yet, allow
    if (!entry) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        retryAfter: 0,
      };
    }

    // Entry expired, reset
    if (now >= entry.resetTime) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        retryAfter: 0,
      };
    }

    // Within window, check count
    if (entry.count < this.maxRequests) {
      entry.count++;

      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        retryAfter: 0,
      };
    }

    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    console.log("[Rate Limiter] Rate limit exceeded", {
      identifier,
      count: entry.count,
      resetTime: new Date(entry.resetTime).toISOString(),
      retryAfter: `${retryAfter}s`,
    });

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.limits.forEach((entry, identifier) => {
      if (now >= entry.resetTime) {
        this.limits.delete(identifier);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log("[Rate Limiter] Cleanup complete", {
        cleanedCount,
        remainingEntries: this.limits.size,
      });
    }
  }

  /**
   * Get current limit count for identifier
   * Useful for testing
   */
  getCount(identifier: string): number {
    return this.limits.get(identifier)?.count || 0;
  }

  /**
   * Clear all limits
   * Only for testing
   */
  clear(): void {
    this.limits.clear();
  }
}

/**
 * Global rate limiter instance
 * 100 requests per hour per IP
 */
export const globalRateLimiter = new RateLimiter(100, 3600000);
