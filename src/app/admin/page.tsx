import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { AppRole, SessionStatus } from "@prisma/client";
import {
  Users,
  UserCheck,
  Building,
  Calendar,
  ClipboardList,
  ScrollText,
  Clock,
  ArrowRight,
  Database,
  Activity,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  // Query real database metrics in parallel via Prisma
  const [
    totalUsersCount,
    membersCount,
    hostsCount,
    activeRoomsCount,
    activeSessionsCount,
    totalAttendanceCount,
    auditLogsCount,
    recentSessions,
    recentAttendance,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: AppRole.MEMBER } }),
    prisma.user.count({ where: { role: AppRole.HOST } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.attendanceSession.count({ where: { status: SessionStatus.ACTIVE } }),
    prisma.attendanceRecord.count(),
    prisma.auditLog.count(),
    prisma.attendanceSession.findMany({
      take: 5,
      orderBy: { startsAt: "desc" },
      include: {
        room: { select: { name: true, code: true } },
        host: { select: { name: true, email: true } },
        _count: { select: { records: true } },
      },
    }),
    prisma.attendanceRecord.findMany({
      take: 5,
      orderBy: { markedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        session: { select: { title: true, room: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 px-3 py-1 text-xs text-blue-300 font-mono mb-2">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>REAL-TIME OPERATIONAL METRICS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            System Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Real-time MySQL database statistics and attendance session metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-1.5 text-xs font-mono text-emerald-400 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>DATABASE ONLINE</span>
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <AdminStatCard
          title="Total Registered Users"
          value={totalUsersCount}
          subtitle="All accounts synced from Clerk"
          icon={<Users className="h-5 w-5" />}
          accentColor="blue"
          href="/admin/members"
        />

        <AdminStatCard
          title="Active Members"
          value={membersCount}
          subtitle="Committee members with MEMBER role"
          icon={<Users className="h-5 w-5" />}
          accentColor="cyan"
          href="/admin/members"
        />

        <AdminStatCard
          title="Authorized Hosts"
          value={hostsCount}
          subtitle="Users permitted to initiate sessions"
          icon={<UserCheck className="h-5 w-5" />}
          accentColor="amber"
          href="/admin/hosts"
        />

        <AdminStatCard
          title="Configured Rooms"
          value={activeRoomsCount}
          subtitle="Active physical geofenced rooms"
          icon={<Building className="h-5 w-5" />}
          accentColor="purple"
          href="/admin/rooms"
        />

        <AdminStatCard
          title="Active Sessions"
          value={activeSessionsCount}
          subtitle="Attendance sessions currently open"
          icon={<Calendar className="h-5 w-5" />}
          accentColor="emerald"
          href="/admin/sessions"
        />

        <AdminStatCard
          title="Total Check-ins"
          value={totalAttendanceCount}
          subtitle="Cumulative verified attendance records"
          icon={<ClipboardList className="h-5 w-5" />}
          accentColor="rose"
          href="/admin/attendance"
        />
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Sessions */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Recent Sessions
              </h2>
            </div>
            <Link
              href="/admin/sessions"
              className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <AdminEmptyState
              title="No sessions created"
              description="No attendance sessions have been initiated in the database yet."
            />
          ) : (
            <div className="space-y-3">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-zinc-950/50 p-3.5 hover:border-white/10 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-white">
                        {s.title}
                      </span>
                      <AdminBadge type={s.status} />
                    </div>
                    <div className="text-xs text-zinc-400 font-mono flex items-center gap-3">
                      <span>Room: {s.room.name}</span>
                      <span>•</span>
                      <span>Host: {s.host.name || s.host.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs text-zinc-400 sm:text-right">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <span>{s._count.records}</span>
                      <span className="text-[10px] text-zinc-500">records</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(s.startsAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance Check-ins */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-emerald-400" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Recent Check-ins
              </h2>
            </div>
            <Link
              href="/admin/attendance"
              className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentAttendance.length === 0 ? (
            <AdminEmptyState
              title="No attendance records"
              description="No members have recorded attendance in the database yet."
            />
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((rec) => (
                <div
                  key={rec.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-zinc-950/50 p-3.5 hover:border-white/10 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-white">
                        {rec.user.name || rec.user.email}
                      </span>
                      <AdminBadge type={rec.status} />
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">
                      Session: {rec.session.title} ({rec.session.room.name})
                    </div>
                  </div>

                  <div className="text-xs font-mono text-zinc-500 sm:text-right flex items-center gap-1">
                    <Clock className="h-3 w-3 text-zinc-500" />
                    <span>{new Date(rec.markedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Quick Status */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/60 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl border border-white/10 bg-zinc-900 text-zinc-400">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-sm font-semibold text-white">
              System Audit Logging
            </div>
            <div className="text-xs text-zinc-400 font-sans">
              {auditLogsCount} security and operational events logged in MySQL
            </div>
          </div>
        </div>

        <Link
          href="/admin/audit-logs"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 px-4 py-2 text-xs font-mono text-zinc-300 transition-colors self-start sm:self-auto"
        >
          <Database className="h-3.5 w-3.5 text-cyan-400" />
          <span>Inspect Audit Trail</span>
        </Link>
      </div>
    </div>
  );
}
