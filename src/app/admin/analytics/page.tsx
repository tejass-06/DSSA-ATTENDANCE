/**
 * DSSA Room Attendance System
 * Admin Attendance Analytics Dashboard
 * Phase 16: Attendance & Admin Management
 */

import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Radio,
  Building,
  Shield,
  Layers,
} from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Attendance Analytics | DSSA Admin",
  description: "Aggregated attendance performance metrics, session breakdowns and room activity",
};

interface AnalyticsPageProps {
  searchParams: Promise<{
    dateRange?: string;
  }>;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;
  const dateRange = params.dateRange?.trim() || "30days";

  // Compute date filter boundary
  const now = new Date();
  const dateFilter: Prisma.DateTimeFilter = {};

  if (dateRange === "today") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    dateFilter.gte = startOfDay;
  } else if (dateRange === "7days") {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 7);
    dateFilter.gte = past7;
  } else if (dateRange === "30days") {
    const past30 = new Date(now);
    past30.setDate(past30.getDate() - 30);
    dateFilter.gte = past30;
  }

  const recordWhere: Prisma.AttendanceRecordWhereInput =
    dateRange !== "all" && Object.keys(dateFilter).length > 0
      ? { markedAt: dateFilter }
      : {};

  const sessionWhere: Prisma.AttendanceSessionWhereInput =
    dateRange !== "all" && Object.keys(dateFilter).length > 0
      ? { startsAt: dateFilter }
      : {};

  // Parallel database aggregations
  const [
    totalAttendance,
    presentCount,
    rejectedCount,
    revokedCount,
    activeSessionsCount,
    totalSessionsCount,
    recentSessions,
  ] = await Promise.all([
    prisma.attendanceRecord.count({ where: recordWhere }),
    prisma.attendanceRecord.count({
      where: { ...recordWhere, status: "PRESENT" },
    }),
    prisma.attendanceRecord.count({
      where: { ...recordWhere, status: "REJECTED" },
    }),
    prisma.attendanceRecord.count({
      where: { ...recordWhere, status: "REVOKED" },
    }),
    prisma.attendanceSession.count({ where: { status: "ACTIVE" } }),
    prisma.attendanceSession.count({ where: sessionWhere }),
    prisma.attendanceSession.findMany({
      where: sessionWhere,
      orderBy: { startsAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        room: {
          select: {
            name: true,
            code: true,
          },
        },
        host: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            records: true,
          },
        },
        records: {
          select: {
            status: true,
          },
        },
      },
    }),
  ]);

  const verificationSuccessRate =
    totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-300 font-mono mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
            <span>OPERATIONAL METRICS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Attendance Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Real-time verification volume, room session utilization, and check-in success metrics.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 p-1 font-mono text-xs text-zinc-300">
          <Link
            href="/admin/analytics?dateRange=today"
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              dateRange === "today"
                ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30"
                : "hover:text-white"
            }`}
          >
            Today
          </Link>
          <Link
            href="/admin/analytics?dateRange=7days"
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              dateRange === "7days"
                ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30"
                : "hover:text-white"
            }`}
          >
            7 Days
          </Link>
          <Link
            href="/admin/analytics?dateRange=30days"
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              dateRange === "30days"
                ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30"
                : "hover:text-white"
            }`}
          >
            30 Days
          </Link>
          <Link
            href="/admin/analytics?dateRange=all"
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              dateRange === "all"
                ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30"
                : "hover:text-white"
            }`}
          >
            All Time
          </Link>
        </div>
      </div>

      {/* Core KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Attendance */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>TOTAL ATTENDANCE</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white">
            {totalAttendance}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Recorded check-ins in selected period
          </div>
        </div>

        {/* Present Count */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 space-y-2">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-mono">
            <span>VERIFIED PRESENT</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-emerald-400">
            {presentCount}
          </div>
          <div className="text-[11px] text-emerald-500/80 font-mono">
            {verificationSuccessRate}% verification success rate
          </div>
        </div>

        {/* Rejected / Revoked Count */}
        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-5 space-y-2">
          <div className="flex items-center justify-between text-rose-300 text-xs font-mono">
            <span>REJECTED / REVOKED</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-rose-400">
            {rejectedCount + revokedCount}
          </div>
          <div className="text-[11px] text-rose-500/80 font-mono">
            {rejectedCount} rejected &bull; {revokedCount} revoked
          </div>
        </div>

        {/* Active & Total Sessions */}
        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-5 space-y-2">
          <div className="flex items-center justify-between text-purple-300 text-xs font-mono">
            <span>ROOM SESSIONS</span>
            <Radio className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-purple-300">
            {totalSessionsCount}
          </div>
          <div className="text-[11px] text-purple-400/80 font-mono flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{activeSessionsCount} currently active</span>
          </div>
        </div>
      </div>

      {/* Verification Quality Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Verification Integrity Breakdown</span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Breakdown of check-ins passing all cryptographic QR and geofence boundary checks.
            </p>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            Total Evaluations: <strong className="text-white">{totalAttendance}</strong>
          </span>
        </div>

        {totalAttendance > 0 ? (
          <div className="space-y-3">
            <div className="h-3 w-full rounded-full bg-zinc-900 overflow-hidden flex">
              <div
                style={{ width: `${(presentCount / totalAttendance) * 100}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Present: ${presentCount}`}
              />
              <div
                style={{ width: `${(rejectedCount / totalAttendance) * 100}%` }}
                className="bg-rose-500 h-full transition-all duration-500"
                title={`Rejected: ${rejectedCount}`}
              />
              <div
                style={{ width: `${(revokedCount / totalAttendance) * 100}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Revoked: ${revokedCount}`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-4 pt-1">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">
                  PRESENT: <strong>{presentCount}</strong> ({Math.round((presentCount / totalAttendance) * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-zinc-300">
                  REJECTED: <strong>{rejectedCount}</strong> ({Math.round((rejectedCount / totalAttendance) * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-zinc-300">
                  REVOKED: <strong>{revokedCount}</strong> ({Math.round((revokedCount / totalAttendance) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs font-mono text-zinc-500">
            No attendance records recorded for the selected date range.
          </p>
        )}
      </div>

      {/* Session Level Performance Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span>Session Attendance Summary</span>
          </h2>
          <Link
            href="/admin/sessions"
            className="text-xs font-mono text-cyan-400 hover:underline"
          >
            View all sessions &rarr;
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-8 text-center text-xs font-mono text-zinc-500">
            No sessions match this timeframe.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4 sm:px-6">Session & Venue</th>
                    <th className="py-3 px-4 sm:px-6">Host</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Verified Present</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Rejected</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Start Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                  {recentSessions.map((session) => {
                    const sessionPresents = session.records.filter(
                      (r) => r.status === "PRESENT"
                    ).length;
                    const sessionRejects = session.records.filter(
                      (r) => r.status === "REJECTED"
                    ).length;

                    return (
                      <tr
                        key={session.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 px-4 sm:px-6">
                          <div className="font-sans font-medium text-white">
                            {session.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3 text-purple-400" />
                            <span>{session.room.name}</span>
                            <span className="text-zinc-500">({session.room.code})</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-zinc-300">
                          <div>{session.host.name || "Host"}</div>
                          <div className="text-[10px] text-zinc-500">
                            {session.host.email}
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-center">
                          <AdminBadge type={session.status} />
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-center text-emerald-400 font-bold">
                          {sessionPresents}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-center text-rose-400">
                          {sessionRejects}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right text-zinc-400">
                          <div>
                            {new Date(session.startsAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {new Date(session.startsAt).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
