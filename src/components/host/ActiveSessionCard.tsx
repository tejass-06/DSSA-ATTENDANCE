"use client";

import React, { useState, useTransition } from "react";
import { endHostSession } from "@/app/host/actions";
import {
  Building,
  Clock,
  MapPin,
  Users,
  Square,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { RotatingQRDisplay } from "./RotatingQRDisplay";

interface ActiveSessionData {
  id: string;
  title: string;
  status: string;
  startsAt: Date | string;
  room: {
    id: string;
    name: string;
    code: string;
    radiusMeters: number;
    latitude: number | string;
    longitude: number | string;
  };
  host: {
    name: string | null;
    email: string;
  };
  attendeesCount: number;
}

interface ActiveSessionCardProps {
  session: ActiveSessionData;
}

export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  const handleEndSession = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await endHostSession(session.id);

      if (!result.success) {
        setErrorMessage(result.message);
        setShowConfirmEnd(false);
      }
    });
  };

  const startedDate = new Date(session.startsAt);

  return (
    <div className="space-y-6">
      {/* Active Session Broadcast Card */}
      <div className="dssa-card rounded-2xl p-5 sm:p-7 space-y-6 border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 via-[#0b0f19] to-[#0b0f19]">
        {/* Top Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-0.5 text-xs font-mono font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>SESSION ACTIVE</span>
              </span>
              <span className="text-xs font-mono text-zinc-400 truncate max-w-[150px]">
                ID: {session.id.slice(-8)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight pt-1">
              {session.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 self-start sm:self-auto">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              Started {startedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dynamic Rotating QR Attendance Channel */}
        <RotatingQRDisplay
          sessionId={session.id}
          isSessionActive={session.status === "ACTIVE"}
        />

        {/* Room & Headcount Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Room Parameters */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-cyan-400" />
                <span>Venue</span>
              </span>
              <span className="text-cyan-300 font-semibold">{session.room.code}</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {session.room.name}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 pt-1">
              <MapPin className="h-3 w-3 text-zinc-500" />
              <span>Geofence Radius: {session.room.radiusMeters}m</span>
            </div>
          </div>

          {/* Headcount */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span>Verified Check-ins</span>
              </span>
              <span className="text-emerald-400 font-bold">{session.attendeesCount}</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {session.attendeesCount} Attendee{session.attendeesCount === 1 ? "" : "s"} Recorded
            </div>
            <div className="text-[11px] font-sans text-zinc-500 pt-1">
              Live headcount streaming will be activated in later phases.
            </div>
          </div>
        </div>

        {/* Session Controls */}
        <div className="pt-2 border-t border-white/[0.06] space-y-3">
          {!showConfirmEnd ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowConfirmEnd(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 font-semibold font-mono text-sm px-5 py-3.5 transition-all cursor-pointer"
            >
              <Square className="h-4 w-4 text-rose-400 fill-current" />
              <span>END ATTENDANCE SESSION</span>
            </button>
          ) : (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 space-y-3 animate-fade-in">
              <div className="text-xs font-mono text-rose-200">
                Are you sure you want to conclude this session? No further check-ins will be accepted once closed.
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleEndSession}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold py-2.5 transition-colors cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>ENDING SESSION...</span>
                    </>
                  ) : (
                    <span>CONFIRM & CONCLUDE</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowConfirmEnd(false)}
                  className="rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs py-2.5 px-4 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Audit Trail Notice */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 text-xs font-mono text-zinc-400 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        <span>
          Session state is authoritative in MySQL. Refreshing the browser preserves active session telemetry.
        </span>
      </div>
    </div>
  );
}
