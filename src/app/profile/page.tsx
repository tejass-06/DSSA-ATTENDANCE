/**
 * DSSA Room Attendance System
 * User Profile & Authorization Details
 * Phase 16: Attendance & Admin Management
 */

import React from "react";
import Image from "next/image";
import { requireAuth } from "@/lib/auth/server";
import { ROLE_METADATA_CONFIG } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import {
  User,
  Mail,
  Shield,
  Key,
  Calendar,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile & Authorization | DSSA",
  description: "View verified account profile and authoritative MySQL application role",
};

export default async function ProfilePage() {
  const user = await requireAuth();

  // Authoritatively load MySQL User record
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.userId },
    include: {
      _count: {
        select: {
          attendanceRecords: true,
          hostedSessions: true,
        },
      },
    },
  });

  const role = dbUser?.role || user.role;
  const roleConfig = ROLE_METADATA_CONFIG[role];

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-10 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-60" />

        <div className="relative mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300 font-mono mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>VERIFIED ACCOUNT PROFILE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Profile &amp; Identity
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                Authoritative account details and application authorization boundary.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-9 w-9 ring-2 ring-emerald-500/30",
                  },
                }}
              />
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-950/20 hover:bg-red-950/40 text-red-400 px-3.5 py-2 text-xs font-mono font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>SIGN OUT</span>
                </button>
              </SignOutButton>
            </div>
          </div>

          {/* Main Profile Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.name}
                  width={80}
                  height={80}
                  className="rounded-2xl border border-emerald-500/30 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <User className="h-10 w-10" />
                </div>
              )}

              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white">
                    {dbUser?.name || user.name}
                  </h2>
                  <span
                    className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded border ${roleConfig.badgeClass}`}
                  >
                    {roleConfig.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{dbUser?.email || user.email}</span>
                </div>

                <p className="text-xs text-zinc-400 pt-1">
                  {roleConfig.description}
                </p>
              </div>
            </div>

            {/* Authoritative Role Authority Notice */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs font-mono text-emerald-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>AUTHORIZATION AUTHORITY: MySQL `User.role`</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Application permissions are strictly derived from the server-side relational database record. Clerk manages authentication identity, while MySQL governs authorization rights.
              </p>
            </div>

            {/* Account Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.06] text-xs font-mono">
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-1">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-cyan-400" />
                  <span>CLERK IDENTITY ID</span>
                </span>
                <p className="text-zinc-200 truncate">{user.userId}</p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-1">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-purple-400" />
                  <span>DATABASE USER ID</span>
                </span>
                <p className="text-zinc-200 truncate">{dbUser?.id || "Auto-synced"}</p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-1">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  <span>REGISTERED AT</span>
                </span>
                <p className="text-zinc-200">
                  {dbUser?.createdAt
                    ? new Date(dbUser.createdAt).toLocaleDateString()
                    : "Active"}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-1">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>ATTENDANCE COUNT</span>
                </span>
                <p className="text-zinc-200">
                  {dbUser?._count.attendanceRecords || 0} check-ins recorded
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
