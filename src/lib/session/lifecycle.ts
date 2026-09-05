import { SessionStatus } from "@prisma/client";

/**
 * Validates permitted session lifecycle transitions
 *
 * Allowed:
 *  - SCHEDULED -> ACTIVE
 *  - ACTIVE -> ENDED
 *  - SCHEDULED -> CANCELLED
 *  - ACTIVE -> CANCELLED
 *
 * All other transitions are rejected.
 */
export function isValidSessionTransition(current: SessionStatus, target: SessionStatus): boolean {
  if (current === SessionStatus.SCHEDULED && target === SessionStatus.ACTIVE) return true;
  if (current === SessionStatus.ACTIVE && target === SessionStatus.ENDED) return true;
  if (current === SessionStatus.SCHEDULED && target === SessionStatus.CANCELLED) return true;
  if (current === SessionStatus.ACTIVE && target === SessionStatus.CANCELLED) return true;
  return false;
}
