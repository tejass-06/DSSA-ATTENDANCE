"use client";

import React, { useState, useTransition } from "react";
import { startHostSession } from "@/app/host/actions";
import { Building, MapPin, Shield, Loader2, AlertCircle, Play } from "lucide-react";

interface RoomItem {
  id: string;
  name: string;
  code: string;
  latitude: number | string;
  longitude: number | string;
  radiusMeters: number;
  isActive: boolean;
  isInUse?: boolean;
}

interface RoomSelectorProps {
  rooms: RoomItem[];
}

export function RoomSelector({ rooms }: RoomSelectorProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    rooms.find((r) => !r.isInUse)?.id || null
  );
  const [sessionTitle, setSessionTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || isPending) return;

    setErrorMessage(null);

    startTransition(async () => {
      const result = await startHostSession(selectedRoomId, sessionTitle);

      if (!result.success) {
        setErrorMessage(result.message);
      }
    });
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="space-y-6">
      <div className="dssa-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-cyan-400" />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Select Attendance Venue
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            {rooms.filter((r) => !r.isInUse).length} Available
          </span>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300 animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {rooms.map((room) => {
            const isSelected = selectedRoomId === room.id;
            const inUse = room.isInUse;

            return (
              <button
                key={room.id}
                type="button"
                disabled={inUse || isPending}
                onClick={() => {
                  if (!inUse) {
                    setSelectedRoomId(room.id);
                    setErrorMessage(null);
                  }
                }}
                className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 min-h-[110px] ${
                  inUse
                    ? "border-white/[0.04] bg-zinc-950/40 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "border-cyan-500/60 bg-cyan-950/30 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/30"
                    : "border-white/[0.06] bg-zinc-950/60 hover:border-white/20 hover:bg-zinc-900/60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-white truncate">
                      {room.name}
                    </span>
                    {inUse ? (
                      <span className="rounded bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono text-rose-300">
                        IN USE
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                        {room.code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-zinc-500" />
                      Radius: {room.radiusMeters}m
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>{inUse ? "Session active" : isSelected ? "● Selected venue" : "Click to select"}</span>
                  {isSelected && !inUse && (
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Start Session Form */}
        <form onSubmit={handleStartSession} className="space-y-4 pt-4 border-t border-white/[0.06]">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wider">
              Session Title (Optional)
            </label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder={selectedRoom ? `${selectedRoom.name} Attendance Session` : "e.g., Weekly DSSA Committee Meeting"}
              disabled={isPending || !selectedRoom}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedRoomId || isPending || selectedRoom?.isInUse}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold font-mono text-sm px-5 py-3.5 transition-all shadow-lg shadow-cyan-950/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>STARTING SESSION...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>START ATTENDANCE SESSION</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Security & Operational Specification Notice */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 text-xs font-mono text-zinc-400 flex items-start gap-2.5">
        <Shield className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-zinc-300">
            Session initiation enforces server-side concurrency locks. Once started, only one active session per host and per room is permitted.
          </p>
        </div>
      </div>
    </div>
  );
}
