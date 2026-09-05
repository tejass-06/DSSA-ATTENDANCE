/**
 * DSSA Room Attendance System
 * React Hook: useLiveAttendance
 * Phase 15: Realtime Live Attendance
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getPusherClient } from "@/lib/realtime/client";
import {
  REALTIME_EVENTS,
  getRealtimeSessionChannel,
  validateRealtimeAttendancePayload,
} from "@/lib/realtime/events";

export type ConnectionState = "LIVE" | "RECONNECTING" | "OFFLINE" | "SYNCED";

export interface LiveAttendeeItem {
  id: string;
  userId: string;
  attendeeName: string;
  status: string;
  markedAt: string;
}

export interface UseLiveAttendanceReturn {
  records: LiveAttendeeItem[];
  totalPresent: number;
  connectionState: ConnectionState;
  lastSyncedAt: string | null;
  isLoading: boolean;
  error: string | null;
  sync: () => Promise<void>;
}

export function useLiveAttendance(
  sessionId: string,
  initialRecords: LiveAttendeeItem[] = [],
  initialTotalPresent: number = 0
): UseLiveAttendanceReturn {
  const [records, setRecords] = useState<LiveAttendeeItem[]>(initialRecords);
  const [totalPresent, setTotalPresent] = useState<number>(initialTotalPresent || initialRecords.length);
  const [connectionState, setConnectionState] = useState<ConnectionState>("OFFLINE");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(new Date().toISOString());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track existing attendance IDs to guarantee zero UI duplication
  const seenIdsRef = useRef<Set<string>>(new Set(initialRecords.map((r) => r.id)));
  const seenUserIdsRef = useRef<Set<string>>(new Set(initialRecords.map((r) => r.userId)));

  // Sync snapshot from database API
  const sync = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/host/sessions/${sessionId}/attendance`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load attendance (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (Array.isArray(data.records)) {
        const newSeenIds = new Set<string>();
        const newSeenUserIds = new Set<string>();
        const dedupedList: LiveAttendeeItem[] = [];

        for (const item of data.records) {
          if (!newSeenIds.has(item.id)) {
            newSeenIds.add(item.id);
            newSeenUserIds.add(item.userId);
            dedupedList.push({
              id: item.id,
              userId: item.userId,
              attendeeName: item.attendeeName,
              status: item.status,
              markedAt: item.markedAt,
            });
          }
        }

        seenIdsRef.current = newSeenIds;
        seenUserIdsRef.current = newSeenUserIds;
        setRecords(dedupedList);
        setTotalPresent(data.session?.totalPresent ?? dedupedList.length);
        setLastSyncedAt(data.syncedAt || new Date().toISOString());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Synchronization failed";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Initial load effect
  useEffect(() => {
    let isCancelled = false;

    async function loadInitial() {
      if (!sessionId) return;
      try {
        const res = await fetch(`/api/host/sessions/${sessionId}/attendance`, {
          cache: "no-store",
        });
        if (!res.ok || isCancelled) return;

        const data = await res.json();
        if (Array.isArray(data.records) && !isCancelled) {
          const newSeenIds = new Set<string>();
          const newSeenUserIds = new Set<string>();
          const dedupedList: LiveAttendeeItem[] = [];

          for (const item of data.records) {
            if (!newSeenIds.has(item.id)) {
              newSeenIds.add(item.id);
              newSeenUserIds.add(item.userId);
              dedupedList.push({
                id: item.id,
                userId: item.userId,
                attendeeName: item.attendeeName,
                status: item.status,
                markedAt: item.markedAt,
              });
            }
          }

          seenIdsRef.current = newSeenIds;
          seenUserIdsRef.current = newSeenUserIds;
          setRecords(dedupedList);
          setTotalPresent(data.session?.totalPresent ?? dedupedList.length);
          setLastSyncedAt(data.syncedAt || new Date().toISOString());
        }
      } catch {
        // Fallback gracefully on network error
      }
    }

    void loadInitial();

    return () => {
      isCancelled = true;
    };
  }, [sessionId]);

  // Establish Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const pusher = getPusherClient();
    if (!pusher) {
      return;
    }

    const channelName = getRealtimeSessionChannel(sessionId);
    const channel = pusher.subscribe(channelName);

    const handleConnected = () => setConnectionState("LIVE");
    const handleConnecting = () => setConnectionState("RECONNECTING");
    const handleUnavailable = () => setConnectionState("OFFLINE");
    const handleFailed = () => setConnectionState("OFFLINE");

    pusher.connection.bind("connected", handleConnected);
    pusher.connection.bind("connecting", handleConnecting);
    pusher.connection.bind("unavailable", handleUnavailable);
    pusher.connection.bind("failed", handleFailed);

    // Bind attendance:recorded event
    const handleAttendanceRecorded = (rawData: unknown) => {
      const validated = validateRealtimeAttendancePayload(rawData);
      if (!validated || validated.sessionId !== sessionId) return;

      // Idempotency: Ignore already processed records
      if (seenIdsRef.current.has(validated.attendanceId)) return;

      seenIdsRef.current.add(validated.attendanceId);
      const isNewUser = !seenUserIdsRef.current.has(validated.userId);
      seenUserIdsRef.current.add(validated.userId);

      const newItem: LiveAttendeeItem = {
        id: validated.attendanceId,
        userId: validated.userId,
        attendeeName: validated.attendeeName,
        status: validated.status,
        markedAt: validated.markedAt,
      };

      setRecords((prev) => [newItem, ...prev.slice(0, 49)]); // Maintain top 50 recent
      if (isNewUser) {
        setTotalPresent((prev) => prev + 1);
      }
    };

    channel.bind(REALTIME_EVENTS.ATTENDANCE_RECORDED, handleAttendanceRecorded);

    // Subscription success / error handlers
    channel.bind("pusher:subscription_succeeded", () => {
      setConnectionState("LIVE");
    });
    channel.bind("pusher:subscription_error", () => {
      setConnectionState("OFFLINE");
    });

    return () => {
      channel.unbind(REALTIME_EVENTS.ATTENDANCE_RECORDED, handleAttendanceRecorded);
      channel.unbind_all();
      pusher.unsubscribe(channelName);

      pusher.connection.unbind("connected", handleConnected);
      pusher.connection.unbind("connecting", handleConnecting);
      pusher.connection.unbind("unavailable", handleUnavailable);
      pusher.connection.unbind("failed", handleFailed);
    };
  }, [sessionId]);

  return {
    records,
    totalPresent,
    connectionState,
    lastSyncedAt,
    isLoading,
    error,
    sync,
  };
}
