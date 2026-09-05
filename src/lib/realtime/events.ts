/**
 * DSSA Room Attendance System
 * Realtime Event Contracts & Channel Vocabulary
 * Phase 15: Realtime Live Attendance
 */

export const REALTIME_EVENTS = {
  ATTENDANCE_RECORDED: "attendance:recorded",
  ATTENDANCE_REVOKED: "attendance:revoked",
  SESSION_STARTED: "session:started",
  SESSION_ENDED: "session:ended",
  SESSION_CANCELLED: "session:cancelled",
} as const;

export type RealtimeEventType = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/**
 * Sanitized attendance payload delivered over private realtime channels.
 * Zero raw tokens, zero coordinate values, zero secret hashes.
 */
export interface RealtimeAttendancePayload {
  attendanceId: string;
  sessionId: string;
  userId: string;
  attendeeName: string;
  status: "PRESENT" | "REVOKED" | "REJECTED";
  markedAt: string; // ISO 8601 server timestamp
  distanceMeters?: number;
}

export interface RealtimeSessionStatusPayload {
  sessionId: string;
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";
  updatedAt: string;
}

export const SESSION_CHANNEL_PREFIX = "private-session-";

/**
 * Returns the isolated private channel name for a specific attendance session.
 */
export function getRealtimeSessionChannel(sessionId: string): string {
  return `${SESSION_CHANNEL_PREFIX}${sessionId.trim()}`;
}

/**
 * Checks whether a channel name conforms to the expected private session channel format.
 */
export function isValidSessionChannel(channelName: string): boolean {
  if (!channelName || typeof channelName !== "string") return false;
  return /^private-session-[a-zA-Z0-9_-]{1,100}$/.test(channelName);
}

/**
 * Extracts the target sessionId from a validated private session channel name.
 */
export function parseSessionIdFromChannel(channelName: string): string | null {
  if (!isValidSessionChannel(channelName)) return null;
  return channelName.replace(SESSION_CHANNEL_PREFIX, "");
}

/**
 * Validates the structure and data types of an incoming RealtimeAttendancePayload.
 */
export function validateRealtimeAttendancePayload(data: unknown): RealtimeAttendancePayload | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  if (
    typeof obj.attendanceId !== "string" ||
    typeof obj.sessionId !== "string" ||
    typeof obj.userId !== "string" ||
    typeof obj.attendeeName !== "string" ||
    typeof obj.status !== "string" ||
    typeof obj.markedAt !== "string"
  ) {
    return null;
  }

  const allowedStatuses = ["PRESENT", "REVOKED", "REJECTED"];
  if (!allowedStatuses.includes(obj.status)) {
    return null;
  }

  // Ensure valid date string
  const parsedDate = Date.parse(obj.markedAt);
  if (isNaN(parsedDate)) {
    return null;
  }

  return {
    attendanceId: obj.attendanceId,
    sessionId: obj.sessionId,
    userId: obj.userId,
    attendeeName: obj.attendeeName,
    status: obj.status as "PRESENT" | "REVOKED" | "REJECTED",
    markedAt: obj.markedAt,
    distanceMeters: typeof obj.distanceMeters === "number" ? Math.round(obj.distanceMeters) : undefined,
  };
}
