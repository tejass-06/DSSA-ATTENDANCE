/**
 * DSSA Room Attendance System
 * Centralized Attendance Submission Service
 * Phase 13: Duplicate Protection + Server Validation Hardening Pass
 */
import { prisma } from "@/lib/db";
import { AttendanceStatus, SessionStatus, AppRole as PrismaAppRole } from "@prisma/client";
import { validateQRChallenge } from "@/lib/qr/service";
import { QR_PROTOCOL_PREFIX } from "@/lib/qr/config";
import { appRoleToPrismaRole, hasMinimumRole, type AppRole } from "@/lib/auth/roles";
import { validateMemberLocation, type ClientLocationInput } from "@/lib/geo/service";
import { evaluateGeofence } from "@/lib/geo/geofence";
import { calculateHaversineDistanceMeters } from "@/lib/geo/distance";
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
    distanceMeters?: number;
  };
}

export interface UserContextParam {
  userId: string; // Clerk userId
  role: AppRole;
  email: string;
  name: string;
}

/**
 * Validates and records member attendance with complete server-side security hardening.
 * Server is the sole authority for identity, role, session validity, QR validity, location calculation, geofence boundary, and timestamp.
 */
export async function processAttendanceSubmission(
  userContext: UserContextParam | null,
  rawPayloadInput: unknown,
  locationInput?: ClientLocationInput | unknown
): Promise<AttendanceSubmissionResult> {
  // 1. Authenticate member
  if (!userContext || !userContext.userId || typeof userContext.userId !== "string") {
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

  // 3. Parse QR payload safely with size limits
  if (!rawPayloadInput || (typeof rawPayloadInput !== "string" && typeof rawPayloadInput !== "object")) {
    return {
      success: false,
      error: "Invalid QR code format.",
      errorCode: "INVALID_QR",
    };
  }

  if (typeof rawPayloadInput === "string" && rawPayloadInput.length > 4096) {
    return {
      success: false,
      error: "QR payload exceeds maximum allowed size.",
      errorCode: "MALFORMED_QR",
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

  // Token & session structure hardening
  if (!sid || sid.length > 100 || !token || token.length > 256 || token.length < 16) {
    return {
      success: false,
      error: "Incomplete or malformed QR code payload.",
      errorCode: "INVALID_PAYLOAD",
    };
  }

  if (!/^[0-9a-fA-F]+$/.test(token)) {
    return {
      success: false,
      error: "Invalid cryptographic challenge token format.",
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

  // 6. Geolocation & Geofence Validation (Phase 11 & Phase 12 service)
  const locationValidation = await validateMemberLocation(session.id, locationInput);
  if (!locationValidation.valid) {
    return {
      success: false,
      error: locationValidation.error || "Location verification failed.",
      errorCode: locationValidation.errorCode || "LOCATION_OUTSIDE",
    };
  }

  const calculatedDistance = locationValidation.distanceMeters ?? 0;

  // 7. Ensure MySQL User record exists & verify MySQL DB role authority
  let dbUser = await prisma.user.findUnique({
    where: { clerkId: userContext.userId },
  });

  if (!dbUser) {
    const prismaRole = appRoleToPrismaRole(userContext.role);
    dbUser = await prisma.user.create({
      data: {
        clerkId: userContext.userId,
        email: userContext.email,
        name: userContext.name,
        role: prismaRole,
      },
    });
  } else {
    // Synchronize latest profile details without overwriting DB role authority
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        email: userContext.email,
        name: userContext.name,
      },
    });
  }

  // DB Role verification: fail-closed if DB role is PENDING
  if (dbUser.role === PrismaAppRole.PENDING) {
    return {
      success: false,
      error: "Your account is pending verification and cannot mark attendance.",
      errorCode: "UNAUTHORIZED_ROLE",
    };
  }


  // 8. Early check for existing attendance record (Fast UX path)
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
        distanceMeters: Math.round(calculatedDistance),
      },
    };
  }

  // 9. Atomic Attendance Creation within Transaction with Comprehensive Race Checks
  const serverMarkedAt = new Date();

  try {
    const newRecord = await prisma.$transaction(async (tx) => {
      // 9a. Re-verify session state within transaction
      const currentSession = await tx.attendanceSession.findUnique({
        where: { id: session.id },
        include: { room: true },
      });

      if (!currentSession || currentSession.status !== SessionStatus.ACTIVE) {
        throw new Error("SESSION_ENDED_DURING_SUBMISSION");
      }

      // 9b. Re-verify room active state
      if (!currentSession.room || !currentSession.room.isActive) {
        throw new Error("ROOM_DEACTIVATED_DURING_SUBMISSION");
      }

      // 9c. Re-verify user role in database
      const txUser = await tx.user.findUnique({
        where: { id: dbUser.id },
        select: { role: true },
      });

      if (!txUser || txUser.role === PrismaAppRole.PENDING) {
        throw new Error("ROLE_REVOKED_DURING_SUBMISSION");
      }

      // 9d. Re-verify current geofence boundary against database room
      const rawCoords = locationInput as Record<string, unknown>;
      const lat = Number(rawCoords.latitude);
      const lon = Number(rawCoords.longitude);
      const acc = rawCoords.accuracy !== undefined ? Number(rawCoords.accuracy) : undefined;
      const roomLat = Number(currentSession.room.latitude);
      const roomLon = Number(currentSession.room.longitude);
      const roomRadius = Number(currentSession.room.radiusMeters);

      const txDist = calculateHaversineDistanceMeters(lat, lon, roomLat, roomLon);
      const txGeofence = evaluateGeofence(txDist, acc, roomRadius);

      if (!txGeofence.allowed) {
        throw new Error(`GEOFENCE_FAILED:${txGeofence.errorCode || "LOCATION_OUTSIDE"}`);
      }

      // 9e. Create attendance record
      const record = await tx.attendanceRecord.create({
        data: {
          sessionId: session.id,
          userId: dbUser.id,
          markedAt: serverMarkedAt,
          status: AttendanceStatus.PRESENT,
        },
      });

      // 9f. Create audit log entry with safe metadata (zero raw coordinates or tokens)
      await tx.auditLog.create({
        data: {
          actorUserId: dbUser.id,
          action: "ATTENDANCE_RECORDED",
          entityType: "AttendanceRecord",
          entityId: record.id,
          metadata: JSON.stringify({
            sessionId: session.id,
            status: AttendanceStatus.PRESENT,
            distanceMeters: Math.round(txDist),
            accuracyMeters: acc,
            geofenceStatus: txGeofence.status,
            serverMarkedAt: serverMarkedAt.toISOString(),
          }),
        },
      });

      return { record, sessionTitle: currentSession.title, roomName: currentSession.room.name, roomCode: currentSession.room.code, dist: txDist };
    });

    return {
      success: true,
      alreadyMarked: false,
      record: {
        id: newRecord.record.id,
        sessionId: session.id,
        sessionTitle: newRecord.sessionTitle,
        roomName: newRecord.roomName,
        roomCode: newRecord.roomCode,
        markedAt: serverMarkedAt.toISOString(),
        status: AttendanceStatus.PRESENT,
        attendeeName: userContext.name,
        distanceMeters: Math.round(newRecord.dist),
      },
    };
  } catch (err) {
    // Session state race
    if (err instanceof Error && err.message === "SESSION_ENDED_DURING_SUBMISSION") {
      return {
        success: false,
        error: "This attendance session is no longer active.",
        errorCode: "SESSION_INACTIVE",
      };
    }

    // Room deactivation race
    if (err instanceof Error && err.message === "ROOM_DEACTIVATED_DURING_SUBMISSION") {
      return {
        success: false,
        error: "The attendance venue is currently unavailable.",
        errorCode: "ROOM_INACTIVE",
      };
    }

    // Role change race
    if (err instanceof Error && err.message === "ROLE_REVOKED_DURING_SUBMISSION") {
      return {
        success: false,
        error: "Your account is not authorized to mark attendance.",
        errorCode: "UNAUTHORIZED_ROLE",
      };
    }

    // Geofence race
    if (err instanceof Error && err.message.startsWith("GEOFENCE_FAILED:")) {
      const geoCode = err.message.split(":")[1];
      return {
        success: false,
        error: "Location is outside the permitted room boundary.",
        errorCode: geoCode || "LOCATION_OUTSIDE",
      };
    }

    // Handle concurrent duplicate race condition on MySQL @@unique([sessionId, userId])
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
            distanceMeters: Math.round(calculatedDistance),
          },
        };
      }
    }

    // Fallback safe failure without exposing stack trace or DB internals
    return {
      success: false,
      error: "Unable to record attendance. Please try again.",
      errorCode: "INTERNAL_ERROR",
    };
  }
}
