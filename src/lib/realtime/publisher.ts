/**
 * DSSA Room Attendance System
 * Server-Side Realtime Event Publisher
 * Phase 15: Realtime Live Attendance
 *
 * Designed for Vercel/Serverless deployment using Pusher REST API with graceful fallback.
 */

import Pusher from "pusher";
import {
  REALTIME_EVENTS,
  getRealtimeSessionChannel,
  type RealtimeAttendancePayload,
  type RealtimeSessionStatusPayload,
} from "./events";

// Lazy-loaded Pusher instance
let pusherServerInstance: Pusher | null = null;

function getPusherServer(): Pusher | null {
  if (pusherServerInstance) return pusherServerInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

  if (appId && key && secret) {
    pusherServerInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
    return pusherServerInstance;
  }

  return null;
}

// In-Memory Ring Buffer for Test Suite & Local Fallback Mode
interface MockPublishedEvent {
  channel: string;
  event: string;
  data: unknown;
  publishedAt: string;
}

const mockEventHistory: MockPublishedEvent[] = [];

/**
 * Publishes an ATTENDANCE_RECORDED event to the designated private session channel.
 *
 * Guarantee: Best-effort delivery. If delivery fails, this function catches the error,
 * logs it, and returns cleanly so the database transaction is NEVER invalidated.
 */
export async function publishAttendanceRecorded(
  sessionId: string,
  payload: RealtimeAttendancePayload
): Promise<{ published: boolean; error?: string }> {
  const channel = getRealtimeSessionChannel(sessionId);
  const event = REALTIME_EVENTS.ATTENDANCE_RECORDED;

  // Record into mock history for test suites / fallback
  mockEventHistory.push({
    channel,
    event,
    data: payload,
    publishedAt: new Date().toISOString(),
  });
  if (mockEventHistory.length > 200) {
    mockEventHistory.shift();
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return { published: true }; // Fallback mode active
  }

  try {
    await pusher.trigger(channel, event, payload);
    return { published: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[RealtimePublisher] Failed to trigger ${event} on ${channel}:`, errorMsg);
    return { published: false, error: errorMsg };
  }
}

/**
 * Publishes session state change events (SESSION_STARTED, SESSION_ENDED, SESSION_CANCELLED).
 */
export async function publishSessionStateChanged(
  sessionId: string,
  payload: RealtimeSessionStatusPayload
): Promise<{ published: boolean; error?: string }> {
  const channel = getRealtimeSessionChannel(sessionId);
  let event: string = REALTIME_EVENTS.SESSION_STARTED;

  if (payload.status === "ENDED") {
    event = REALTIME_EVENTS.SESSION_ENDED;
  } else if (payload.status === "CANCELLED") {
    event = REALTIME_EVENTS.SESSION_CANCELLED;
  }

  mockEventHistory.push({
    channel,
    event,
    data: payload,
    publishedAt: new Date().toISOString(),
  });

  const pusher = getPusherServer();
  if (!pusher) {
    return { published: true };
  }

  try {
    await pusher.trigger(channel, event, payload);
    return { published: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[RealtimePublisher] Failed to trigger session state event on ${channel}:`, errorMsg);
    return { published: false, error: errorMsg };
  }
}

/**
 * Test Helper: Returns mock published events for a channel.
 */
export function getMockEventsForSession(sessionId: string): MockPublishedEvent[] {
  const channel = getRealtimeSessionChannel(sessionId);
  return mockEventHistory.filter((e) => e.channel === channel);
}

/**
 * Test Helper: Clears in-memory mock history.
 */
export function clearMockEvents(): void {
  mockEventHistory.length = 0;
}
