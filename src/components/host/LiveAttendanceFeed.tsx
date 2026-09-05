/**
 * DSSA Room Attendance System
 * Live Attendance Feed Component for Host Mode
 * Phase 15: Realtime Live Attendance
 */

"use client";

import React from "react";
import { useLiveAttendance, type ConnectionState } from "@/hooks/useLiveAttendance";
import { Users, RefreshCw, Radio, CheckCircle2, AlertCircle } from "lucide-react";

interface LiveAttendanceFeedProps {
  sessionId: string;
  initialTotalPresent?: number;
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 shadow-sm shadow-emerald-950/50">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        LIVE
      </span>
    );
  }

  if (state === "RECONNECTING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 text-xs font-mono font-medium text-amber-400">
        <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
        RECONNECTING
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-xs font-mono text-zinc-400">
      <Radio className="h-3 w-3 text-zinc-500" />
      SYNCED
    </span>
  );
}

export function LiveAttendanceFeed({ sessionId, initialTotalPresent = 0 }: LiveAttendanceFeedProps) {
  const { records, totalPresent, connectionState, lastSyncedAt, isLoading, error, sync } =
    useLiveAttendance(sessionId, [], initialTotalPresent);

  return (
    <div className="space-y-4">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-4 sm:p-5 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Live Attendance Feed</h3>
              <ConnectionBadge state={connectionState} />
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              {lastSyncedAt ? `Synced at ${new Date(lastSyncedAt).toLocaleTimeString()}` : "Awaiting sync..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Total Present Counter */}
          <div className="flex items-baseline gap-1.5 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Present:</span>
            <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
              {totalPresent}
            </span>
          </div>

          {/* Manual Sync Button */}
          <button
            onClick={() => void sync()}
            disabled={isLoading}
            title="Synchronize attendance from server"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-white/[0.08] hover:text-white transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-cyan-400" : "text-zinc-400"}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300 font-mono">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Attendees List */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-md shadow-xl">
        <div className="border-b border-white/[0.06] bg-zinc-950/40 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Recent Attendees ({records.length})
          </span>
          <span className="text-[11px] font-mono text-zinc-500">Auto-updates in real time</span>
        </div>

        {records.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03] border border-white/10 text-zinc-500 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-zinc-300">No attendance marked yet</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 font-sans">
              Members will appear here automatically when they scan the rotating QR code within the room boundary.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
            {records.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-sm font-semibold text-white truncate">{item.attendeeName}</p>
                    <p className="text-[11px] font-mono text-zinc-500">ID: {item.userId.slice(-6)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      PRESENT
                    </span>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      {new Date(item.markedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
