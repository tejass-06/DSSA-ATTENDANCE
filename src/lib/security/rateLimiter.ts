/**
 * DSSA Room Attendance System
 * Privacy-Conscious In-Memory Sliding-Window Rate Limiter
 * Phase 14: Advanced Anti-Proxy Hardening
 *
 * NOTE: Designed for development and single-instance deployments.
 * For horizontally-scaled serverless production, this interface can be backed by Redis / Upstash.
 */

interface RateLimitRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private cache = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically prune stale entries every 60 seconds
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.pruneStaleEntries(), 60_000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Evaluates whether an action is permitted within a rolling window.
   *
   * @param key Unique rate limiting key (e.g. `att:submit:${userId}`)
   * @param maxRequests Maximum allowed requests in the time window
   * @param windowMs Rolling window in milliseconds
   */
  public check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTimeMs: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.cache.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.cache.set(key, record);
    }

    // Filter out timestamps outside the active rolling window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= maxRequests) {
      const oldestInWindow = record.timestamps[0] || now;
      const resetTimeMs = oldestInWindow + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetTimeMs: Math.max(0, resetTimeMs),
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      allowed: true,
      remaining: maxRequests - record.timestamps.length,
      resetTimeMs: windowMs,
    };
  }

  /**
   * Explicitly resets rate limit state for a key (useful in test suites).
   */
  public reset(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Resets all cached rate limits.
   */
  public resetAll(): void {
    this.cache.clear();
  }

  private pruneStaleEntries(): void {
    const now = Date.now();
    const maxRetentionMs = 120_000; // 2 minutes

    for (const [key, record] of this.cache.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxRetentionMs);
      if (record.timestamps.length === 0) {
        this.cache.delete(key);
      }
    }
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter();

/**
 * Attendance Submission Rate Limits:
 * - Burst limit: 5 requests per 10 seconds (allows rapid legitimate retries)
 * - Sustained limit: 20 requests per 60 seconds (blocks automated hammering)
 */
export const ATTENDANCE_SUBMISSION_BURST_MAX = 5;
export const ATTENDANCE_SUBMISSION_BURST_WINDOW_MS = 10_000;

export const ATTENDANCE_SUBMISSION_SUSTAINED_MAX = 20;
export const ATTENDANCE_SUBMISSION_SUSTAINED_WINDOW_MS = 60_000;

/**
 * Rate limit check for attendance submission endpoint.
 */
export function checkAttendanceSubmissionRateLimit(userId: string): {
  allowed: boolean;
  reason?: string;
} {
  const burstKey = `att:burst:${userId}`;
  const burstCheck = globalRateLimiter.check(
    burstKey,
    ATTENDANCE_SUBMISSION_BURST_MAX,
    ATTENDANCE_SUBMISSION_BURST_WINDOW_MS
  );

  if (!burstCheck.allowed) {
    return {
      allowed: false,
      reason: "RATE_LIMIT_BURST_EXCEEDED",
    };
  }

  const sustainedKey = `att:sustained:${userId}`;
  const sustainedCheck = globalRateLimiter.check(
    sustainedKey,
    ATTENDANCE_SUBMISSION_SUSTAINED_MAX,
    ATTENDANCE_SUBMISSION_SUSTAINED_WINDOW_MS
  );

  if (!sustainedCheck.allowed) {
    return {
      allowed: false,
      reason: "RATE_LIMIT_SUSTAINED_EXCEEDED",
    };
  }

  return { allowed: true };
}
