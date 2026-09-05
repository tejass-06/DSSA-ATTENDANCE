/**
 * DSSA Room Attendance System
 * Numerically Safe Haversine Great-Circle Distance Calculator
 * Phase 11: Geolocation Capture + Location Validation
 */
import { EARTH_RADIUS_METERS } from "./config";

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two geographic coordinates on Earth using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in decimal degrees [-90, 90]
 * @param lon1 Longitude of point 1 in decimal degrees [-180, 180]
 * @param lat2 Latitude of point 2 in decimal degrees [-90, 90]
 * @param lon2 Longitude of point 2 in decimal degrees [-180, 180]
 * @returns Distance in meters
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // If coordinates are exactly identical, distance is 0
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  // Haversine formula
  const sinHalfDeltaPhi = Math.sin(deltaPhi / 2);
  const sinHalfDeltaLambda = Math.sin(deltaLambda / 2);

  const a =
    sinHalfDeltaPhi * sinHalfDeltaPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfDeltaLambda * sinHalfDeltaLambda;

  // Clamp 'a' to [0, 1] to prevent floating point inaccuracies from producing NaN in sqrt
  const clampedA = Math.max(0, Math.min(1, a));

  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_METERS * c;
}
