"use client";

import React, { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Download, RotateCcw } from "lucide-react";

interface AttendanceFilterBarProps {
  rooms: { id: string; name: string; code: string }[];
  sessions: { id: string; title: string }[];
  currentFilters: {
    status?: string;
    roomId?: string;
    sessionId?: string;
    search?: string;
    dateRange?: string;
  };
}

export function AttendanceFilterBar({
  rooms,
  sessions,
  currentFilters,
}: AttendanceFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to first page on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    const params = new URLSearchParams(searchParams.toString());
    if (search && search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  // Build CSV Export URL preserving current filter query string
  const exportUrl = `/api/admin/attendance/export?${searchParams.toString()}`;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/90 p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            name="search"
            defaultValue={currentFilters.search || ""}
            placeholder="Search member name or email..."
            className="w-full rounded-xl border border-white/10 bg-zinc-950/70 pl-10 pr-24 py-2 text-xs font-mono text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1 text-[11px] font-mono font-medium text-white transition-colors"
          >
            Search
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {(currentFilters.search ||
            currentFilters.status ||
            currentFilters.roomId ||
            currentFilters.sessionId ||
            currentFilters.dateRange) && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 px-3 py-2 text-xs font-mono text-zinc-300 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <a
            href={exportUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 px-3.5 py-2 text-xs font-mono font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/[0.04] text-xs font-mono">
        {/* Status Filter */}
        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">Status</label>
          <select
            value={currentFilters.status || "ALL"}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">PRESENT</option>
            <option value="REJECTED">REJECTED</option>
            <option value="REVOKED">REVOKED</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">Date Range</label>
          <select
            value={currentFilters.dateRange || "ALL"}
            onChange={(e) => handleFilterChange("dateRange", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        {/* Room Filter */}
        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">Room</label>
          <select
            value={currentFilters.roomId || "ALL"}
            onChange={(e) => handleFilterChange("roomId", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Rooms</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.code})
              </option>
            ))}
          </select>
        </div>

        {/* Session Filter */}
        <div>
          <label className="block text-[11px] text-zinc-400 mb-1">Session</label>
          <select
            value={currentFilters.sessionId || "ALL"}
            onChange={(e) => handleFilterChange("sessionId", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-zinc-200 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Sessions</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isPending && (
        <div className="text-[11px] font-mono text-blue-400 animate-pulse">
          Updating attendance ledger...
        </div>
      )}
    </div>
  );
}
