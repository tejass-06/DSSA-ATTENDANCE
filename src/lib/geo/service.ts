/**
 * DSSA Room Attendance System
 * Centralized Server-Side Geolocation & Geofence Validation Service
 * Phase 11 & Phase 12: Room Geofencing + Boundary Enforcement
 */
import { prisma } from "@/lib/db";
import { SessionStatus } from "@prisma/client";
import { calculateHaversineDistanceMeters } from "./distance";
import { evaluateGeofence, type GeofenceEvaluationResult } from "./geofence";

export interface ClientLocationInput {
  latitude: unknown;
  longitude: unknown;
  accuracy?: unknown;
  timestamp?: unknown;
}

export interface LocationValidationResult {
  valid: boolean;
  distanceMeters?: number;
  accuracyMeters?: number;
  error?: string;
  errorCode?: string;
  geofence?: GeofenceEvaluationResult;
  room?: {
    id: string;
    name: string;
    code: string;
    radiusMeters: number;
    latitude: number;
    longitude: number;
  };
}

/**
 * Validates member coordinates, GPS accuracy, and enforces room geofence boundaries.
 * The server independently resolves the room from the active session and performs all calculations.
 */
export async function validateMemberLocation(
  sessionId: string,
  locationInput: unknown
): Promise<LocationValidationResult> {
  // 1. Validate session identifier
  if (!sessionId || typeof sessionId !== "string") {
    return {
      valid: false,
      error: "Session identifier is required for location verification.",
      errorCode: "INVALID_SESSION_ID",
    };
  }

  // 2. Resolve session and associated room from database
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      room: true,
    },
  });

  if (!session) {
    return {
      valid: false,
      error: "Attendance session not found.",
      errorCode: "SESSION_NOT_FOUND",
    };
  }

  if (session.status !== SessionStatus.ACTIVE) {
    return {
      valid: false,
      error: `Attendance session is no longer active (${session.status}).`,
      errorCode: "SESSION_NOT_ACTIVE",
    };
  }

  if (!session.room || !session.room.isActive) {
    return {
      valid: false,
      error: "The selected attendance room is currently unavailable.",
      errorCode: "ROOM_INACTIVE",
    };
  }

  // 3. Validate presence of location input object
  if (!locationInput || typeof locationInput !== "object") {
    return {
      valid: false,
      error: "Location information is required.",
      errorCode: "LOCATION_UNAVAILABLE",
    };
  }

  const rawCoords = locationInput as Record<string, unknown>;

  // 4. Validate latitude
  const latVal = rawCoords.latitude;
  if (latVal === null || latVal === undefined || typeof latVal !== "number" || !Number.isFinite(latVal)) {
    return {
      valid: false,
      error: "Invalid or missing latitude coordinate.",
      errorCode: "INVALID_COORDINATES",
    };
  }

  if (latVal < -90 || latVal > 90) {
    return {
      valid: false,
      error: "Latitude out of bounds (-90 to 90).",
      errorCode: "INVALID_COORDINATES",
    };
  }

  // 5. Validate longitude
  const lonVal = rawCoords.longitude;
  if (lonVal === null || lonVal === undefined || typeof lonVal !== "number" || !Number.isFinite(lonVal)) {
    return {
      valid: false,
      error: "Invalid or missing longitude coordinate.",
      errorCode: "INVALID_COORDINATES",
    };
  }

  if (lonVal < -180 || lonVal > 180) {
    return {
      valid: false,
      error: "Longitude out of bounds (-180 to 180).",
      errorCode: "INVALID_COORDINATES",
    };
  }

  // 6. Validate accuracy (if supplied)
  let accuracyMeters: number | undefined = undefined;
  if (rawCoords.accuracy !== undefined && rawCoords.accuracy !== null) {
    const accVal = rawCoords.accuracy;
    if (typeof accVal !== "number" || !Number.isFinite(accVal) || accVal < 0) {
      return {
        valid: false,
        error: "Invalid location accuracy value.",
        errorCode: "INVALID_ACCURACY",
      };
    }
    accuracyMeters = accVal;
  }

  // 7. Calculate authoritative Haversine distance against database room coordinates
  const roomLat = Number(session.room.latitude);
  const roomLon = Number(session.room.longitude);
  const roomRadius = Number(session.room.radiusMeters);

  const distanceMeters = calculateHaversineDistanceMeters(latVal, lonVal, roomLat, roomLon);

  // 8. Phase 12 Geofence Boundary Enforcement
  const geofenceResult = evaluateGeofence(distanceMeters, accuracyMeters, roomRadius);

  if (!geofenceResult.allowed) {
    return {
      valid: false,
      distanceMeters,
      accuracyMeters,
      geofence: geofenceResult,
      error: geofenceResult.error || "Location is outside the permitted room boundary.",
      errorCode: geofenceResult.errorCode || "LOCATION_OUTSIDE",
    };
  }

  return {
    valid: true,
    distanceMeters,
    accuracyMeters,
    geofence: geofenceResult,
    room: {
      id: session.room.id,
      name: session.room.name,
      code: session.room.code,
      radiusMeters: roomRadius,
      latitude: roomLat,
      longitude: roomLon,
    },
  };
}
