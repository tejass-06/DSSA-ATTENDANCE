import React from "react";
import { prisma } from "@/lib/db";
import { ClipboardList, Clock, ShieldCheck } from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Attendance Records | DSSA Admin",
  description: "View verified member attendance check-in records",
};

export default async function AdminAttendancePage() {
  const records = await prisma.attendanceRecord.findMany({
    orderBy: { markedAt: "desc" },
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
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });

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
            Cryptographically and geofence-verified member room check-in ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Total Records:</span>
          <span className="font-bold text-white text-sm">{records.length}</span>
        </div>
      </div>

      {/* Attendance Table */}
      {records.length === 0 ? (
        <AdminEmptyState
          title="No attendance records exist yet"
          description="Verified check-ins from members scanning dynamic room QR codes will be recorded here."
          icon={<ClipboardList className="h-6 w-6 text-zinc-500" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">Member</th>
                  <th className="py-3.5 px-4 sm:px-6">Session & Room</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Marked Timestamp</th>
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
                        User ID: {rec.user.id}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono">
                      <div className="text-zinc-200 font-medium font-sans">
                        {rec.session.title}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {rec.session.room.name} ({rec.session.room.code})
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
