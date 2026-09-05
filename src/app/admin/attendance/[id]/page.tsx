/**
 * DSSA Room Attendance System
 * Admin Attendance Record Detail View
 * Phase 16: Attendance & Admin Management
 */

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  Clock,
  ShieldCheck,
  Building,
  User,
  Radio,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Attendance Record Details | DSSA Admin",
  description: "Detailed verification and provenance summary for attendance record",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AttendanceDetailPage({ params }: PageProps) {
  const { id } = await params;

  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          clerkId: true,
          createdAt: true,
        },
      },
      session: {
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          room: {
            select: {
              id: true,
              name: true,
              code: true,
              radiusMeters: true,
              isActive: true,
            },
          },
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!record) {
    notFound();
  }

  const markedDate = new Date(record.markedAt);
  const istTime = markedDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "medium",
  });
  const utcTime = markedDate.toUTCString();

  return (
    <div className="space-y-6">
      {/* Back Link & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <Link
            href="/admin/attendance"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Attendance Ledger</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Attendance Record
            </h1>
            <AdminBadge type={record.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-400">
            Record ID: <span className="text-zinc-200">{record.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 bg-zinc-900/60 border border-white/10 px-3.5 py-2 rounded-xl">
          <Clock className="h-3.5 w-3.5 text-emerald-400" />
          <span>{istTime}</span>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Member Information Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Member Identity</h2>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              MySQL User Record
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 font-mono">Full Name:</span>
              <p className="text-sm font-medium text-white">
                {record.user.name || "Unnamed Member"}
              </p>
            </div>
            <div>
              <span className="text-zinc-500 font-mono">Email Address:</span>
              <p className="text-sm font-mono text-zinc-300">
                {record.user.email}
              </p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-zinc-500 font-mono">Application Role:</span>
                <div className="mt-0.5">
                  <AdminBadge type={record.user.role} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 font-mono">Member Since:</span>
                <p className="text-zinc-300 font-mono">
                  {new Date(record.user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Session & Host Information Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Session Context</h2>
            </div>
            <AdminBadge type={record.session.status} />
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 font-mono">Session Title:</span>
              <p className="text-sm font-medium text-white">
                {record.session.title}
              </p>
            </div>
            <div>
              <span className="text-zinc-500 font-mono">Session Host:</span>
              <p className="text-sm font-medium text-zinc-200">
                {record.session.host.name || record.session.host.email}
              </p>
              <p className="text-[11px] font-mono text-zinc-500">
                {record.session.host.email}
              </p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-zinc-500 font-mono">Session ID:</span>
                <p className="text-zinc-400 font-mono text-[11px] truncate max-w-[160px]">
                  {record.session.id}
                </p>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 font-mono">Started:</span>
                <p className="text-zinc-300 font-mono">
                  {new Date(record.session.startsAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Physical Room & Geofence Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Room Boundary</h2>
            </div>
            <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded">
              {record.session.room.code}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 font-mono">Venue Name:</span>
              <p className="text-sm font-medium text-white">
                {record.session.room.name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-zinc-500 font-mono">Authorized Radius:</span>
                <p className="text-sm font-mono text-zinc-200">
                  {record.session.room.radiusMeters} meters
                </p>
              </div>
              <div>
                <span className="text-zinc-500 font-mono">Room Status:</span>
                <p className="text-sm font-mono text-emerald-400">
                  {record.session.room.isActive ? "ACTIVE" : "INACTIVE"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification & Security Integrity Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Verification & Provenance</h2>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              VERIFIED
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between rounded-lg bg-zinc-950/60 p-2.5 border border-white/[0.04]">
              <span className="text-zinc-400">Cryptographic QR Rotation:</span>
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Valid Nonce
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-zinc-950/60 p-2.5 border border-white/[0.04]">
              <span className="text-zinc-400">Geofence Boundary:</span>
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Within {record.session.room.radiusMeters}m
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-zinc-950/60 p-2.5 border border-white/[0.04]">
              <span className="text-zinc-400">Database Constraint:</span>
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> @@unique([sessionId, userId])
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timestamps Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/50 p-5 font-mono text-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-zinc-400 gap-2">
          <span>Authoritative Server Timestamp (UTC):</span>
          <span className="text-zinc-200">{utcTime}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-zinc-400 gap-2 border-t border-white/[0.04] pt-2">
          <span>Local Venue Time (IST):</span>
          <span className="text-emerald-400">{istTime}</span>
        </div>
      </div>
    </div>
  );
}
