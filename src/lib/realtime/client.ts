/**
 * DSSA Room Attendance System
 * Client-Side Realtime Connection Manager
 * Phase 15: Realtime Live Attendance
 */

import PusherClient from "pusher-js";

let pusherClientInstance: PusherClient | null = null;

/**
 * Returns a configured PusherClient singleton instance.
 * If credentials are not configured, returns null to gracefully fallback.
 */
export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;
  if (pusherClientInstance) return pusherClientInstance;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

  if (!key) {
    return null;
  }

  pusherClientInstance = new PusherClient(key, {
    cluster,
    authEndpoint: "/api/realtime/auth",
    forceTLS: true,
  });

  return pusherClientInstance;
}
