/**
 * DSSA Room Attendance System
 * Client Attendance Context & Trust Sanitization
 * Phase 14: Advanced Anti-Proxy Hardening
 */

export interface ClientAttendanceContext {
  contextId?: string;
  clientTime?: string;
  [key: string]: unknown;
}

/**
 * Validates and sanitizes optional ephemeral client attendance context.
 *
 * Requirements:
 * - Opaque random string (UUID, hex, or alphanumeric, length between 16 and 64 chars).
 * - NEVER used as an authentication credential.
 * - NEVER trusted for security decisions.
 * - Any client-supplied flags (e.g. `trustedDevice`, `riskScore`, `isVerified`) are strictly discarded.
 */
export function sanitizeClientContext(rawInput: unknown): {
  contextId?: string;
  sanitized: boolean;
} {
  if (!rawInput || typeof rawInput !== "object") {
    return { sanitized: true };
  }

  const input = rawInput as Record<string, unknown>;
  let contextId: string | undefined = undefined;

  if (typeof input.contextId === "string") {
    const trimmed = input.contextId.trim();
    if (trimmed.length >= 16 && trimmed.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      contextId = trimmed;
    }
  }

  return {
    contextId,
    sanitized: true,
  };
}
