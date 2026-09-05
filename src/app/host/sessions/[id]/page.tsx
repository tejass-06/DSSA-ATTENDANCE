import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/server";
import { appRoleToPrismaRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HostHeader } from "@/components/host/HostHeader";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { RotatingQRDisplay } from "@/components/host/RotatingQRDisplay";
import {
  Calendar,
  Clock,
  Building,
  MapPin,
  Users,
  Shield,
  ArrowLeft,
  QrCode,
  Radio,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Session Operational Report | DSSA Host",
  description: "Detailed operational and audit telemetry for an attendance session",
};

interface HostSessionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function HostSessionDetailPage({ params }: HostSessionDetailPageProps) {
  const { id: sessionId } = await params;

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

  // 3. Query the session with room, host, and record counts
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      room: true,
      host: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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

  if (!session) {
    notFound();
  }

  // 4. Enforce strict session ownership:
  // Ordinary HOST can only view their own sessions; ADMIN & SUPER_ADMIN can inspect all.
  const isOwner = session.hostUserId === dbUser.id;
  const isElevatedAdmin = authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";

  if (!isOwner && !isElevatedAdmin) {
    notFound();
  }

  const startDate = new Date(session.startsAt);
  const endDate = session.endsAt ? new Date(session.endsAt) : null;
  const durationMinutes = endDate
    ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-8 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-50" />

        <div className="relative mx-auto max-w-4xl space-y-6">
          {/* Host Header */}
          <HostHeader
            user={{
              name: authUser.name,
              email: authUser.email,
              role: authUser.role,
            }}
            hasActiveSession={session.status === "ACTIVE"}
            activeTab="detail"
          />

          {/* Navigation Back */}
          <div className="flex items-center justify-between">
            <Link
              href="/host/sessions"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Session History</span>
            </Link>

            {session.status === "ACTIVE" && (
              <Link
                href="/host"
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-950/70 px-3 py-1.5 text-xs font-mono text-cyan-300 transition-colors"
              >
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span>Open Live Console</span>
              </Link>
            )}
          </div>

          {/* Session Overview Card */}
          <div className="dssa-card rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AdminBadge type={session.status} />
                  <span className="font-mono text-xs text-zinc-400 truncate max-w-[200px]">
                    Session ID: {session.id}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight pt-1">
                  {session.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span>Attendance:</span>
                <span className="font-bold text-emerald-400">{session._count.records}</span>
              </div>
            </div>

            {/* Parameter Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Room Specifications */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Meeting Venue</span>
                  </span>
                  <span className="text-cyan-300 font-semibold">{session.room.code}</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {session.room.name}
                </div>
                <div className="flex flex-col gap-1 text-xs font-mono text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-zinc-500" />
                    <span>Coordinates: {Number(session.room.latitude).toFixed(4)}, {Number(session.room.longitude).toFixed(4)}</span>
                  </div>
                  <div>Geofence Radius: {session.room.radiusMeters} meters</div>
                </div>
              </div>

              {/* Host & Operator Details */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-amber-400" />
                    <span>Authorized Host</span>
                  </span>
                  <span className="text-amber-300 font-semibold">{session.host.role}</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {session.host.name || "DSSA Host"}
                </div>
                <div className="font-mono text-xs text-zinc-400 truncate">
                  {session.host.email}
                </div>
                <div className="font-mono text-[10px] text-zinc-600 truncate">
                  Host User ID: {session.hostUserId}
                </div>
              </div>
            </div>

            {/* Timeline Breakdown */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 space-y-3 font-mono text-xs">
              <div className="text-zinc-400 font-semibold uppercase tracking-wider text-[11px] border-b border-white/[0.04] pb-2">
                Session Telemetry Timeline
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-zinc-300">
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500">START TIMESTAMP</div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-cyan-400" />
                    <span>{startDate.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Clock className="h-3 w-3 text-zinc-500" />
                    <span>{startDate.toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500">CONCLUDED TIMESTAMP</div>
                  {endDate ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-emerald-400" />
                        <span>{endDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        <span>{endDate.toLocaleTimeString()}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-amber-400">In Progress (Active)</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500">TOTAL DURATION</div>
                  <div className="text-white font-semibold">
                    {durationMinutes ? `${durationMinutes} min` : session.status === "ACTIVE" ? "Ongoing" : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* QR Channel Status or Live Rotating Broadcast */}
            {session.status === "ACTIVE" ? (
              <RotatingQRDisplay
                sessionId={session.id}
                isSessionActive={true}
              />
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <QrCode className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-300">
                    Dynamic Rotating QR Challenges: <strong className="text-white">{session._count.qrChallenges} generated</strong> during session
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Channel closed ({session.status})
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
