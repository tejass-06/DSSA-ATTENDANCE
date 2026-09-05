/**
 * DSSA Room Attendance System
 * QR Challenge Configuration Constants
 * Phase 9: Rotating QR Attendance System
 */

/**
 * Lifetime (in milliseconds) of a rotating QR challenge token.
 * After this duration, the challenge is considered expired by the server.
 */
export const QR_CHALLENGE_TTL_MS = 15_000; // 15 seconds

/**
 * Interval (in milliseconds) between automatic client QR rotations.
 */
export const QR_ROTATION_INTERVAL_MS = 15_000; // 15 seconds

/**
 * Server validation grace period (in milliseconds) to account for mobile GPS lock
 * acquisition and network transport delay when a member submits.
 */
export const QR_GRACE_PERIOD_MS = 25_000; // 25 seconds grace (total window = 40 seconds)

/**
 * Protocol identifier prefix for QR challenge payloads
 */
export const QR_PROTOCOL_PREFIX = "DSSA_ATT_V1";
