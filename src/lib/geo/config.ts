/**
 * DSSA Room Attendance System
 * Geolocation Configuration & Threshold Constants
 * Phase 11: Geolocation Capture + Location Validation
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
