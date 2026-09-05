/**
 * DSSA Room Attendance System
 * QR Challenge Configuration Constants
 * Phase 9: Rotating QR Attendance System
 */

/**
 * Lifetime (in milliseconds) of a rotating QR challenge token.
 * After this duration, the challenge is considered expired by the server.
 */
export const QR_CHALLENGE_TTL_MS = 10_000; // 10 seconds

/**
 * Interval (in milliseconds) between automatic client QR rotations.
 */
export const QR_ROTATION_INTERVAL_MS = 10_000; // 10 seconds

/**
 * Server validation grace period (in milliseconds) to account for network transport delay
 * when a member submits right at the rotation boundary.
 */
export const QR_GRACE_PERIOD_MS = 2_000; // 2 seconds

/**
 * Protocol identifier prefix for QR challenge payloads
 */
export const QR_PROTOCOL_PREFIX = "DSSA_ATT_V1";
