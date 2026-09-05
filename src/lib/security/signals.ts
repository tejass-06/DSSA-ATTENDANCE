/**
 * DSSA Room Attendance System
 * Security Signals & Sanitized Security Event Logger
 * Phase 14: Advanced Anti-Proxy Hardening
 */

import { prisma } from "@/lib/db";

export const SECURITY_ACTIONS = {
  ATTENDANCE_RECORDED: "ATTENDANCE_RECORDED",
  ATTENDANCE_DUPLICATE: "ATTENDANCE_DUPLICATE",
  RATE_LIMITED: "RATE_LIMITED",
  QR_INVALID: "QR_INVALID",
  QR_EXPIRED: "QR_EXPIRED",
  LOCATION_OUTSIDE: "LOCATION_OUTSIDE",
  LOCATION_UNCERTAIN: "LOCATION_UNCERTAIN",
  UNAUTHORIZED_ATTEMPT: "UNAUTHORIZED_ATTEMPT",
  MALFORMED_PAYLOAD: "MALFORMED_PAYLOAD",
} as const;

export type SecurityAction = (typeof SECURITY_ACTIONS)[keyof typeof SECURITY_ACTIONS];

export interface SafeSecurityMetadata {
  sessionId?: string;
  reason?: string;
  status?: string;
  distanceMeters?: number;
  accuracyMeters?: number;
  geofenceStatus?: string;
  contextId?: string;
  clientVersion?: string;
  [key: string]: unknown;
}

/**
 * Safely writes a security event into AuditLog without throwing errors
 * or leaking raw tokens / coordinates.
 */
export async function logSecurityEvent(
  actorUserId: string | null,
  action: SecurityAction | string,
  entityId: string,
  metadata?: SafeSecurityMetadata
): Promise<void> {
  try {
    // Sanitize metadata: strictly exclude any potential raw tokens or coordinates
    const safeMeta: Record<string, unknown> = {};

    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        // Strip sensitive keys
        if (
          key.toLowerCase().includes("token") ||
          key.toLowerCase().includes("secret") ||
          key.toLowerCase().includes("latitude") ||
          key.toLowerCase().includes("longitude") ||
          key.toLowerCase().includes("coords")
        ) {
          continue;
        }
        safeMeta[key] = value;
      }
    }

    safeMeta.loggedAt = new Date().toISOString();

    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        action,
        entityType: "SecurityEvent",
        entityId,
        metadata: JSON.stringify(safeMeta),
      },
    });
  } catch (err) {
    // Fail non-destructively for security logs to avoid breaking normal flow
    console.error("[SecurityAuditLog] Failed to record security event:", err);
  }
}
