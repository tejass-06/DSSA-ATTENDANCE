"use server";

import { getCurrentUserWithRole } from "@/lib/auth/server";
import {
  processAttendanceSubmission,
  type AttendanceSubmissionResult,
} from "@/lib/attendance/service";

/**
 * Server Action: Submit scanned QR code payload for attendance recording.
 * Strictly derives user identity from authenticated Clerk session.
 */
export async function submitAttendanceAction(
  rawPayload: string
): Promise<AttendanceSubmissionResult> {
  const user = await getCurrentUserWithRole();
  return processAttendanceSubmission(user, rawPayload);
}
