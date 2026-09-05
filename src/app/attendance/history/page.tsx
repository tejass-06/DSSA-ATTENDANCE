/**
 * DSSA Room Attendance System
 * Member Personal Attendance History
 * Phase 16: Attendance & Admin Management
 */

import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  ClipboardList,
  Clock,
  Building,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Attendance History | DSSA",
  description: "Personal verified room attendance history",
};

export default async function MemberAttendanceHistoryPage() {
  // 1. Authoritative authenticated user resolution
  const user = await requireAuth();

  // 2. Resolve MySQL User ID (ignoring any query params from client)
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.userId },
    select: { id: true, name: true, email: true },
  });

  if (!dbUser) {
    return (
      <div className="flex min-h-screen flex-col bg-[#030712] text-white">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto p-6 text-center space-y-4">
          <p className="text-zinc-400">User record not found in system.</p>
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Query only records belonging strictly to this user
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: dbUser.id },
    orderBy: { markedAt: "desc" },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
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
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-8 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-50" />

        <div className="relative mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <Link
                href="/attendance"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Scanner</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <ClipboardList className="h-6 w-6 text-emerald-400" />
                <span>My Attendance History</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                Verified room check-ins recorded for <span className="text-zinc-200 font-medium">{dbUser.name || dbUser.email}</span>.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
              <span>Total Check-ins:</span>
              <span className="font-bold text-emerald-400 text-sm">{records.length}</span>
            </div>
          </div>

          {/* Records List */}
          {records.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-10 text-center space-y-3">
              <ClipboardList className="h-10 w-10 text-zinc-600 mx-auto" />
              <h2 className="text-base font-semibold text-white">No attendance history yet</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                When you scan rotating room QR codes during active meetings, your verified attendance will appear here.
              </p>
              <div className="pt-2">
                <Link
                  href="/attendance"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-mono font-medium text-white transition-colors"
                >
                  Scan Room QR
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => {
                const markedDate = new Date(rec.markedAt);
                const isPresent = rec.status === "PRESENT";

                return (
                  <div
                    key={rec.id}
                    className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-4 sm:p-5 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                            isPresent
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-950/40 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {isPresent ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          <span>{rec.status}</span>
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {rec.session.room.code}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-white">
                        {rec.session.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{rec.session.room.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.04] text-xs font-mono text-zinc-400">
                      <div className="flex items-center gap-1.5 text-zinc-200">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>
                          {markedDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {markedDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Privacy Note */}
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 text-xs font-mono text-zinc-500 flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500/60 flex-shrink-0" />
            <span>
              Your attendance records are cryptographically verified and bound to your authenticated identity.
            </span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
