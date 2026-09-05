/**
 * DSSA Room Attendance System
 * Centralized Geofence Boundary & Accuracy Evaluator
 * Phase 12: Room Geofencing + Attendance Boundary Enforcement
 */
import {
  MIN_ROOM_RADIUS_METERS,
  MAX_ROOM_RADIUS_METERS,
  MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS,
} from "./config";

export type GeofenceStatus = "INSIDE" | "OUTSIDE" | "UNCERTAIN" | "INVALID";

export interface GeofenceEvaluationResult {
  status: GeofenceStatus;
  allowed: boolean;
  distanceMeters: number;
  accuracyMeters?: number;
  radiusMeters: number;
  reason?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Evaluates whether a member's position is safely within the configured room geofence.
 *
 * Boundary Policy:
 * 1. Invalid radius / distance -> INVALID (fail closed).
 * 2. Accuracy > MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS -> UNCERTAIN (fail closed).
 * 3. Clearly Inside (distance + accuracy <= radius) -> INSIDE (allowed).
 * 4. Clearly Outside (distance - accuracy > radius) -> OUTSIDE (rejected).
 * 5. Boundary / Uncertain (uncertainty ellipse overlaps boundary) -> UNCERTAIN (rejected, retry requested).
 *
 * @param distanceMeters Calculated Haversine distance between member and room venue
 * @param accuracyMeters Horizontal GPS accuracy uncertainty reported by device
 * @param radiusMeters Configured room radius from database
 */
export function evaluateGeofence(
  distanceMeters: number,
  accuracyMeters: number | undefined,
  radiusMeters: number
): GeofenceEvaluationResult {
  // 1. Validate room radius from database
  if (
    typeof radiusMeters !== "number" ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters < MIN_ROOM_RADIUS_METERS ||
    radiusMeters > MAX_ROOM_RADIUS_METERS
  ) {
    return {
      status: "INVALID",
      allowed: false,
      distanceMeters,
      accuracyMeters,
      radiusMeters,
      error: "Room location could not be verified due to invalid venue configuration.",
      errorCode: "INVALID_RADIUS",
    };
  }

  // 2. Validate distance
  if (
    typeof distanceMeters !== "number" ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    return {
      status: "INVALID",
      allowed: false,
      distanceMeters,
      accuracyMeters,
      radiusMeters,
      error: "Invalid distance calculation.",
      errorCode: "INVALID_DISTANCE",
    };
  }

  // 3. Validate accuracy
  let validAccuracy: number | undefined = accuracyMeters;
  if (accuracyMeters !== undefined) {
    if (typeof accuracyMeters !== "number" || !Number.isFinite(accuracyMeters) || accuracyMeters < 0) {
      return {
        status: "INVALID",
        allowed: false,
        distanceMeters,
        accuracyMeters,
        radiusMeters,
        error: "Invalid location accuracy value.",
        errorCode: "INVALID_ACCURACY",
      };
    }

    if (accuracyMeters > MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS) {
      return {
        status: "UNCERTAIN",
        allowed: false,
        distanceMeters,
        accuracyMeters,
        radiusMeters,
        error: `Location accuracy is too low (${Math.round(accuracyMeters)}m uncertainty). Please acquire a stronger GPS signal.`,
        errorCode: "LOCATION_ACCURACY_TOO_LOW",
      };
    }
  } else {
    validAccuracy = 0;
  }

  const acc = validAccuracy ?? 0;

  // 4. Exact zero-uncertainty evaluation
  if (acc === 0) {
    if (distanceMeters <= radiusMeters) {
      return {
        status: "INSIDE",
        allowed: true,
        distanceMeters,
        accuracyMeters: 0,
        radiusMeters,
        reason: "Confirmed inside room boundary.",
      };
    } else {
      return {
        status: "OUTSIDE",
        allowed: false,
        distanceMeters,
        accuracyMeters: 0,
        radiusMeters,
        error: "You're outside the attendance area. Move closer to the committee room and try again.",
        errorCode: "LOCATION_OUTSIDE",
      };
    }
  }

  // 5. Accuracy-Aware Boundary Evaluation:
  // Clearly Inside: Entire uncertainty radius is inside the geofence
  if (distanceMeters + acc <= radiusMeters) {
    return {
      status: "INSIDE",
      allowed: true,
      distanceMeters,
      accuracyMeters: acc,
      radiusMeters,
      reason: "Confirmed inside room geofence boundary.",
    };
  }

  // Clearly Outside: Closest possible point in uncertainty radius is outside the geofence
  if (distanceMeters - acc > radiusMeters) {
    return {
      status: "OUTSIDE",
      allowed: false,
      distanceMeters,
      accuracyMeters: acc,
      radiusMeters,
      error: "You're outside the attendance area. Move closer to the committee room and try again.",
      errorCode: "LOCATION_OUTSIDE",
    };
  }

  // Boundary / Uncertain: Uncertainty interval overlaps the geofence boundary
  // Conservative policy: Fail closed and ask member to retry with a clearer GPS reading
  return {
    status: "UNCERTAIN",
    allowed: false,
    distanceMeters,
    accuracyMeters: acc,
    radiusMeters,
    error: "Location could not be confirmed. Your GPS signal is too close to the room boundary. Try again from inside the room.",
    errorCode: "LOCATION_UNCERTAIN",
  };
}
