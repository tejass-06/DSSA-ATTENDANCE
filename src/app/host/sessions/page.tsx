import React from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { appRoleToPrismaRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HostHeader } from "@/components/host/HostHeader";
import { HostEmptyState } from "@/components/host/HostEmptyState";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { History, Calendar, Clock, Building, Users, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hosted Sessions History | DSSA Host",
  description: "View historical record of attendance sessions hosted by your account",
};

export default async function HostSessionsHistoryPage() {
  // 1. Strict server-side authorization check (requires HOST, ADMIN, or SUPER_ADMIN)
  const authUser = await requireRole("HOST");

  // 2. Resolve MySQL user
  const prismaRole = appRoleToPrismaRole(authUser.role);
  const dbUser = await prisma.user.upsert({
    where: { clerkId: authUser.userId },
    update: {
      email: authUser.email,
      name: authUser.name,
      role: prismaRole,
    },
    create: {
      clerkId: authUser.userId,
      email: authUser.email,
      name: authUser.name,
      role: prismaRole,
    },
  });

  // 3. Query sessions hosted by the current user
  const sessions = await prisma.attendanceSession.findMany({
    where: { hostUserId: dbUser.id },
    orderBy: { startsAt: "desc" },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          code: true,
          radiusMeters: true,
        },
      },
      _count: {
        select: {
          records: true,
        },
      },
    },
  });

  const hasActiveSession = sessions.some((s) => s.status === "ACTIVE");

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-8 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-50" />

        <div className="relative mx-auto max-w-4xl space-y-6">
          {/* Host Header with History Tab Active */}
          <HostHeader
            user={{
              name: authUser.name,
              email: authUser.email,
              role: authUser.role,
            }}
            hasActiveSession={hasActiveSession}
            activeTab="history"
          />

          {/* Header Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <History className="h-4 w-4 text-cyan-400" />
              <span>Historical Session Records</span>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              Total Hosted: <strong className="text-white">{sessions.length}</strong>
            </span>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <HostEmptyState
              title="No Sessions Hosted Yet"
              description="Sessions you initiate and manage from the Live Console will appear in this historical archive."
              icon={<History className="h-6 w-6 text-zinc-500" />}
            />
          ) : (
            <div className="space-y-3.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm p-4 sm:p-5 hover:border-cyan-500/30 transition-all duration-150 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.04] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-white group-hover:text-cyan-300 transition-colors">
                          {s.title}
                        </h3>
                        <AdminBadge type={s.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <Building className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Venue: {s.room.name} ({s.room.code})</span>
                        <span>•</span>
                        <span>Radius: {s.room.radiusMeters}m</span>
                      </div>
                    </div>

                    <Link
                      href={`/host/sessions/${s.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors self-start sm:self-auto"
                    >
                      <span>Inspect Details</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400" />
                    </Link>
                  </div>

                  {/* Schedule & Attendance Snapshot */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400 pt-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{new Date(s.startsAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>
                          {new Date(s.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {s.endsAt ? ` - ${new Date(s.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " (Ongoing)"}
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-2.5 py-1 text-emerald-300">
                      <Users className="h-3 w-3 text-emerald-400" />
                      <span>{s._count.records} Check-in{s._count.records === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
