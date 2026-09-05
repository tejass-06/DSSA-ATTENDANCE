/**
 * DSSA Room Attendance System
 * Centralized Attendance Submission Service
 * Phase 10: Member QR Scanning + Attendance Submission
 */
import { prisma } from "@/lib/db";
import { AttendanceStatus, SessionStatus } from "@prisma/client";
import { validateQRChallenge } from "@/lib/qr/service";
import { QR_PROTOCOL_PREFIX } from "@/lib/qr/config";
import { appRoleToPrismaRole, hasMinimumRole, type AppRole } from "@/lib/auth/roles";
import { Prisma } from "@prisma/client";

export interface AttendanceSubmissionResult {
  success: boolean;
  alreadyMarked?: boolean;
  error?: string;
  errorCode?: string;
  record?: {
    id: string;
    sessionId: string;
    sessionTitle: string;
    roomName: string;
    roomCode: string;
    markedAt: string;
    status: string;
    attendeeName: string;
  };
}

export interface UserContextParam {
  userId: string; // Clerk userId
  role: AppRole;
  email: string;
  name: string;
}

/**
 * Validates and records member attendance.
 * Server is the sole authority for identity, session validity, QR token validation, and timestamp.
 */
export async function processAttendanceSubmission(
  userContext: UserContextParam | null,
  rawPayloadInput: unknown
): Promise<AttendanceSubmissionResult> {
  // 1. Authenticate member
  if (!userContext || !userContext.userId) {
    return {
      success: false,
      error: "Authentication required. Please sign in.",
      errorCode: "UNAUTHENTICATED",
    };
  }

  // 2. Validate role: MEMBER or higher required; PENDING rejected
  if (!hasMinimumRole(userContext.role, "MEMBER")) {
    return {
      success: false,
      error: "Your account is currently pending verification and cannot mark attendance.",
      errorCode: "UNAUTHORIZED_ROLE",
    };
  }

  // 3. Parse QR payload safely
  if (!rawPayloadInput || (typeof rawPayloadInput !== "string" && typeof rawPayloadInput !== "object")) {
    return {
      success: false,
      error: "Invalid QR code format.",
      errorCode: "INVALID_QR",
    };
  }

  let parsed: Record<string, unknown>;
  if (typeof rawPayloadInput === "string") {
    try {
      parsed = JSON.parse(rawPayloadInput);
    } catch {
      return {
        success: false,
        error: "Malformed QR code payload.",
        errorCode: "MALFORMED_QR",
      };
    }
  } else {
    parsed = rawPayloadInput as Record<string, unknown>;
  }

  // 4. Validate protocol version and payload schema
  if (!parsed || typeof parsed !== "object") {
    return {
      success: false,
      error: "Invalid QR payload structure.",
      errorCode: "INVALID_QR",
    };
  }

  if (parsed.v !== QR_PROTOCOL_PREFIX) {
    return {
      success: false,
      error: "Unsupported QR code version. Please scan a current DSSA QR code.",
      errorCode: "INVALID_VERSION",
    };
  }

  const sid = typeof parsed.sid === "string" ? parsed.sid.trim() : "";
  const token = typeof parsed.token === "string" ? parsed.token.trim() : "";

  if (!sid || !token) {
    return {
      success: false,
      error: "Incomplete QR code payload.",
      errorCode: "INVALID_PAYLOAD",
    };
  }

  // 5. Cryptographic QR Challenge Validation (Phase 9 service)
  const qrValidation = await validateQRChallenge(sid, token);
  if (!qrValidation.valid || !qrValidation.session) {
    const rawError = qrValidation.error || "INVALID_CHALLENGE";
    const code = rawError.split(":")[0].trim();
    let message = "Invalid or expired QR code.";

    if (code === "CHALLENGE_EXPIRED") {
      message = "This QR code has expired. Please scan the current rotating QR on the screen.";
    } else if (code === "SESSION_INACTIVE") {
      message = "This attendance session is no longer active.";
    } else if (code === "SESSION_MISMATCH") {
      message = "QR code session mismatch.";
    }

    return {
      success: false,
      error: message,
      errorCode: code,
    };
  }


  const session = qrValidation.session;

  // 6. Ensure MySQL User record is synchronized
  const prismaRole = appRoleToPrismaRole(userContext.role);
  const dbUser = await prisma.user.upsert({
    where: { clerkId: userContext.userId },
    update: {
      email: userContext.email,
      name: userContext.name,
      role: prismaRole,
    },
    create: {
      clerkId: userContext.userId,
      email: userContext.email,
      name: userContext.name,
      role: prismaRole,
    },
  });

  // 7. Check for existing attendance record
  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_userId: {
        sessionId: session.id,
        userId: dbUser.id,
      },
    },
    include: {
      session: {
        include: { room: true },
      },
      user: {
        select: { name: true, email: true },
      },
    },
  });

  if (existingRecord) {
    return {
      success: true,
      alreadyMarked: true,
      record: {
        id: existingRecord.id,
        sessionId: session.id,
        sessionTitle: existingRecord.session.title,
        roomName: existingRecord.session.room.name,
        roomCode: existingRecord.session.room.code,
        markedAt: existingRecord.markedAt.toISOString(),
        status: existingRecord.status,
        attendeeName: existingRecord.user.name || userContext.name,
      },
    };
  }

  // 8. Atomically create AttendanceRecord (handles concurrent race conditions gracefully)
  const serverMarkedAt = new Date();

  try {
    const newRecord = await prisma.$transaction(async (tx) => {
      // Re-verify session is still active inside transaction
      const currentSession = await tx.attendanceSession.findUnique({
        where: { id: session.id },
        select: { status: true },
      });

      if (!currentSession || currentSession.status !== SessionStatus.ACTIVE) {
        throw new Error("SESSION_ENDED_DURING_SUBMISSION");
      }

      // Create attendance record
      const record = await tx.attendanceRecord.create({
        data: {
          sessionId: session.id,
          userId: dbUser.id,
          markedAt: serverMarkedAt,
          status: AttendanceStatus.PRESENT,
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          actorUserId: dbUser.id,
          action: "ATTENDANCE_RECORDED",
          entityType: "AttendanceRecord",
          entityId: record.id,
          metadata: JSON.stringify({
            sessionId: session.id,
            status: AttendanceStatus.PRESENT,
            serverMarkedAt: serverMarkedAt.toISOString(),
          }),
        },
      });

      return record;
    });

    return {
      success: true,
      alreadyMarked: false,
      record: {
        id: newRecord.id,
        sessionId: session.id,
        sessionTitle: session.title,
        roomName: session.room.name,
        roomCode: session.room.code,
        markedAt: serverMarkedAt.toISOString(),
        status: AttendanceStatus.PRESENT,
        attendeeName: userContext.name,
      },
    };
  } catch (err) {
    // Check if session ended during submission
    if (err instanceof Error && err.message === "SESSION_ENDED_DURING_SUBMISSION") {
      return {
        success: false,
        error: "This attendance session has just ended.",
        errorCode: "SESSION_INACTIVE",
      };
    }

    // Check if duplicate race condition triggered MySQL @@unique([sessionId, userId])
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const duplicateRecord = await prisma.attendanceRecord.findUnique({
        where: {
          sessionId_userId: {
            sessionId: session.id,
            userId: dbUser.id,
          },
        },
        include: {
          session: { include: { room: true } },
          user: { select: { name: true } },
        },
      });

      if (duplicateRecord) {
        return {
          success: true,
          alreadyMarked: true,
          record: {
            id: duplicateRecord.id,
            sessionId: session.id,
            sessionTitle: duplicateRecord.session.title,
            roomName: duplicateRecord.session.room.name,
            roomCode: duplicateRecord.session.room.code,
            markedAt: duplicateRecord.markedAt.toISOString(),
            status: duplicateRecord.status,
            attendeeName: duplicateRecord.user.name || userContext.name,
          },
        };
      }
    }

    // Unhandled error - return safe generic failure, never expose DB details
    return {
      success: false,
      error: "Unable to record attendance. Please try again.",
      errorCode: "INTERNAL_ERROR",
    };
  }
}
