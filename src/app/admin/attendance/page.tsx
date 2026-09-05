import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  ClipboardList,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building,
} from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AttendanceFilterBar } from "@/components/admin/AttendanceFilterBar";
import { AttendanceStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Attendance Ledger | DSSA Admin",
  description: "Server-side filtered and paginated cryptographic attendance ledger",
};

interface AdminAttendancePageProps {
  searchParams: Promise<{
    status?: string;
    roomId?: string;
    sessionId?: string;
    search?: string;
    dateRange?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function AdminAttendancePage({
  searchParams,
}: AdminAttendancePageProps) {
  const params = await searchParams;
  const statusParam = params.status?.toUpperCase();
  const roomId = params.roomId?.trim();
  const sessionId = params.sessionId?.trim();
  const search = params.search?.trim();
  const dateRange = params.dateRange?.trim();
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  // Build Prisma where query condition
  const where: Prisma.AttendanceRecordWhereInput = {};

  if (
    statusParam &&
    Object.values(AttendanceStatus).includes(statusParam as AttendanceStatus)
  ) {
    where.status = statusParam as AttendanceStatus;
  }

  if (roomId) {
    where.session = {
      ...(where.session as Prisma.AttendanceSessionWhereInput),
      roomId: roomId,
    };
  }

  if (sessionId) {
    where.sessionId = sessionId;
  }

  if (search) {
    where.user = {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    };
  }

  // Date Range Handling
  if (dateRange && dateRange !== "ALL") {
    const now = new Date();
    if (dateRange === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.markedAt = { gte: startOfDay, lte: endOfDay };
    } else if (dateRange === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      where.markedAt = { gte: startOfDay, lte: endOfDay };
    } else if (dateRange === "7days") {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      where.markedAt = { gte: past7 };
    } else if (dateRange === "30days") {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 30);
      where.markedAt = { gte: past30 };
    }
  }

  // Fetch count & paginated records in parallel
  const [totalCount, records, rooms, sessions] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      orderBy: { markedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        session: {
          select: {
            id: true,
            title: true,
            status: true,
            room: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    }),
    prisma.room.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.attendanceSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Build pagination query string generator
  const buildPageUrl = (page: number) => {
    const urlParams = new URLSearchParams();
    if (params.status) urlParams.set("status", params.status);
    if (params.roomId) urlParams.set("roomId", params.roomId);
    if (params.sessionId) urlParams.set("sessionId", params.sessionId);
    if (params.search) urlParams.set("search", params.search);
    if (params.dateRange) urlParams.set("dateRange", params.dateRange);
    urlParams.set("page", page.toString());
    return `/admin/attendance?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/40 px-3 py-1 text-xs text-rose-300 font-mono mb-2">
            <ClipboardList className="h-3.5 w-3.5 text-rose-400" />
            <span>ATTENDANCE LEDGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Attendance Records
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Cryptographically and geofence-verified member check-in ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Matching Records:</span>
          <span className="font-bold text-white text-sm">{totalCount}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <AttendanceFilterBar
        rooms={rooms}
        sessions={sessions}
        currentFilters={params}
      />

      {/* Attendance Table */}
      {records.length === 0 ? (
        <AdminEmptyState
          title="No attendance records match your filters"
          description="Try adjusting your search criteria, selected date range, room, or status filters."
          icon={<ClipboardList className="h-6 w-6 text-zinc-500" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">Member</th>
                  <th className="py-3.5 px-4 sm:px-6">Session & Venue</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Marked Timestamp</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {records.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-medium text-white">
                        {rec.user.name || "Member"}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-400">
                        {rec.user.email}
                      </div>
                      <div className="font-mono text-[9px] text-zinc-600 truncate max-w-[140px]">
                        ID: {rec.user.id}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono">
                      <div className="text-zinc-200 font-medium font-sans">
                        {rec.session.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Building className="h-3 w-3 text-cyan-400" />
                        <span>{rec.session.room.name}</span>
                        <span className="text-zinc-500">({rec.session.room.code})</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <AdminBadge type={rec.status} />
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right font-mono text-zinc-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>
                          {new Date(rec.markedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(rec.markedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <Link
                        href={`/admin/attendance/${rec.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 font-mono text-[11px] text-zinc-300 hover:text-white transition-colors"
                      >
                        <Eye className="h-3 w-3 text-blue-400" />
                        <span>Detail</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[0.06] bg-zinc-950/40 px-4 sm:px-6 py-3 font-mono text-xs text-zinc-400">
              <div>
                Page <span className="font-semibold text-white">{currentPage}</span> of{" "}
                <span className="font-semibold text-white">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-600 cursor-not-allowed">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-600 cursor-not-allowed">
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Database Constraint Indicator */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 text-xs font-mono text-zinc-400 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
        <span>
          Enforced by database compound unique key <code className="text-emerald-400 font-mono">@@unique([sessionId, userId])</code> to prevent proxy replay duplicates.
        </span>
      </div>
    </div>
  );
}
