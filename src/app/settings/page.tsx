/**
 * DSSA Room Attendance System
 * System & User Settings Overview
 * Phase 16: Attendance & Admin Management
 */

import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Settings,
  Clock,
  Radio,
  Building,
  Lock,
} from "lucide-react";
import {
  MIN_ROOM_RADIUS_METERS,
  MAX_ROOM_RADIUS_METERS,
} from "@/lib/geo/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings & System Policy | DSSA",
  description: "View system configurations, security policies, and application settings",
};

export default async function SettingsPage() {
  await requireAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-10 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-60" />

        <div className="relative mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 px-3 py-1 text-xs text-blue-300 font-mono mb-2">
              <Settings className="h-3.5 w-3.5 text-blue-400" />
              <span>APPLICATION CONFIGURATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              System Settings &amp; Policies
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400">
              System-wide operational parameters, security constraints, and active policies.
            </p>
          </div>

          {/* Policy Parameters Cards */}
          <div className="space-y-4">
            {/* Geofencing Configuration */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Building className="h-4 w-4 text-purple-400" />
                <span>Geofencing &amp; Boundary Parameters</span>
              </div>
              <p className="text-xs text-zinc-400">
                Rooms configure authoritative GPS center points and boundary radii. Radius validation enforces physical perimeter bounds.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
                  <span className="text-zinc-500 block text-[11px]">ALLOWED RADIUS RANGE</span>
                  <span className="text-white font-bold">
                    {MIN_ROOM_RADIUS_METERS}m – {MAX_ROOM_RADIUS_METERS}m
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
                  <span className="text-zinc-500 block text-[11px]">DISTANCE ALGORITHM</span>
                  <span className="text-emerald-400 font-bold">
                    Numerically Safe Haversine
                  </span>
                </div>
              </div>
            </div>

            {/* Timezone & Localization */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>Timezone &amp; Temporal Authority</span>
              </div>
              <p className="text-xs text-zinc-400">
                Database timestamps are recorded in UTC. All UI displays and CSV ledger exports convert to local Indian Standard Time (IST).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
                  <span className="text-zinc-500 block text-[11px]">DATABASE TIME</span>
                  <span className="text-zinc-300">UTC (Authoritative)</span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
                  <span className="text-zinc-500 block text-[11px]">OPERATIONAL TIMEZONE</span>
                  <span className="text-emerald-400 font-bold">Asia/Kolkata (IST, UTC+5:30)</span>
                </div>
              </div>
            </div>

            {/* Cryptographic QR TTL */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Radio className="h-4 w-4 text-cyan-400" />
                <span>Rotating QR Challenge Security</span>
              </div>
              <p className="text-xs text-zinc-400">
                QR tokens rotate dynamically on the host screen during active sessions. Challenges expire automatically to prevent replay attacks.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
                  <span className="text-zinc-500 block text-[11px]">CHALLENGE ROTATION</span>
                  <span className="text-cyan-400 font-bold">15 Seconds TTL</span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
                  <span className="text-zinc-500 block text-[11px]">HASH ALGORITHM</span>
                  <span className="text-white font-bold">SHA-256 Nonce Hash</span>
                </div>
              </div>
            </div>

            {/* Administrative Management Note */}
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/50 p-5 text-xs font-mono text-zinc-400 flex items-start gap-3">
              <Lock className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Administrative Management</p>
                <p className="text-zinc-500 mt-0.5 leading-relaxed">
                  System settings, user roles, and venue registries are controlled by authorized administrators via the{" "}
                  <Link href="/admin" className="text-cyan-400 hover:underline">
                    Admin Center
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
