import React from "react";
import { prisma } from "@/lib/db";
import { Calendar, Users, Clock } from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Session Overview | DSSA Admin",
  description: "View room attendance sessions and statuses",
};

export default async function AdminSessionsPage() {
  const sessions = await prisma.attendanceSession.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      host: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          records: true,
          qrChallenges: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300 font-mono mb-2">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>SESSION OPERATIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Attendance Sessions
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Read-only operational log of all scheduled, active, and completed room sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Total Sessions:</span>
          <span className="font-bold text-white text-sm">{sessions.length}</span>
        </div>
      </div>

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <AdminEmptyState
          title="No attendance sessions have been created"
          description="Sessions initiated by authorized hosts will appear in this operational log."
          icon={<Calendar className="h-6 w-6 text-zinc-500" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">Session Title</th>
                  <th className="py-3.5 px-4 sm:px-6">Room</th>
                  <th className="py-3.5 px-4 sm:px-6">Host</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Check-ins</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-medium text-white">{s.title}</div>
                      <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[140px]">
                        ID: {s.id}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-zinc-300">
                      <div>{s.room.name}</div>
                      <div className="text-[10px] text-zinc-500">{s.room.code}</div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-zinc-300">
                      <div>{s.host.name || "Host"}</div>
                      <div className="text-[10px] text-zinc-500">{s.host.email}</div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <AdminBadge type={s.status} />
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center font-mono">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-2.5 py-1 text-emerald-300">
                        <Users className="h-3 w-3 text-emerald-400" />
                        <span>{s._count.records} attendees</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right font-mono text-zinc-400 space-y-1">
                      <div className="flex items-center justify-end gap-1 text-zinc-300">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        <span>{new Date(s.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="text-[10px] text-zinc-500">({new Date(s.startsAt).toLocaleDateString()})</span>
                      </div>
                      {s.endsAt && (
                        <div className="text-[10px] text-zinc-500">
                          Ended: {new Date(s.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
