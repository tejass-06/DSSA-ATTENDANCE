/**
 * DSSA Room Attendance System
 * Geolocation Configuration & Threshold Constants
 * Phase 11 & Phase 12: Room Geofencing & Boundary Constants
 */

/**
 * Maximum acceptable horizontal location accuracy reported by client device (in meters).
 * Readings with uncertainty > 100m are rejected as insufficiently reliable.
 */
export const MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS = 100;

/**
 * Earth radius constant in meters (WGS-84 mean radius)
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Minimum valid room geofence radius in meters.
 * Prevents impossible zero/negative radius room misconfigurations.
 */
export const MIN_ROOM_RADIUS_METERS = 5;

/**
 * Maximum valid room geofence radius in meters.
 * Prevents excessively broad venue radius definitions.
 */
export const MAX_ROOM_RADIUS_METERS = 500;
