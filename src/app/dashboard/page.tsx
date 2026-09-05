import { requireAuth } from "@/lib/auth/server";
import { ROLE_METADATA_CONFIG } from "@/lib/auth/roles";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import {
  ShieldCheck,
  User,
  Mail,
  Key,
  LogOut,
  Calendar,
  ArrowRight,
  Smartphone,
  Shield,
  QrCode,
  Info,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAuth();
  const roleConfig = ROLE_METADATA_CONFIG[user.role];

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-10 px-4 sm:px-6 lg:px-8">
        {/* Glow ambient */}
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-60" />
        <div className="pointer-events-none absolute top-10 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl space-y-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400 font-mono">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>AUTHENTICATED</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-semibold ${roleConfig.badgeClass}`}>
                  <Shield className="h-3.5 w-3.5" />
                  <span>ROLE: {user.role}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                DSSA ATTENDANCE
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Welcome, <span className="font-semibold text-white">{user.name}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-10 w-10 ring-2 ring-emerald-500/30",
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

          {/* User Profile Card */}
          <div className="dssa-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
                <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-300">
                  SERVER-VERIFIED IDENTITY &amp; AUTHORIZATION
                </h2>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                VERIFIED
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.name}
                  width={72}
                  height={72}
                  className="rounded-2xl border border-emerald-500/30 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <User className="h-8 w-8" />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{user.name}</h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${roleConfig.badgeClass}`}>
                    {roleConfig.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    {user.email}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 pt-1">
                  {roleConfig.description}
                </p>
              </div>
            </div>

            {/* Authentication & Authorization Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Key className="h-3.5 w-3.5 text-cyan-400" />
                  <span>CLERK USER ID</span>
                </div>
                <p className="font-mono text-xs text-zinc-200 truncate">{user.userId}</p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  <span>AUTH TRUST BOUNDARY</span>
                </div>
                <p className="font-mono text-xs text-zinc-200">
                  Server-side Verified (Phase 3)
                </p>
              </div>
            </div>
          </div>

          {/* Role-Based Navigation & Access Verification Launchers */}
          <div className="space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              AVAILABLE MODULES &amp; ACTIONS
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Member Attendance Scanner */}
              <div className="dssa-card rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      MEMBER+
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white">Attendance Scanner</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Scan active rotating room QR codes to check in.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    href="/attendance"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    <span>Open Scanner</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Attendance History */}
              <div className="dssa-card rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      MEMBER+
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white">My History</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    View verified check-in records and timestamps.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    href="/attendance/history"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    <span>View History</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Host Mode Link */}
              <div className="dssa-card rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                      HOST+
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white">Host Mode</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Start live room session and project rotating QR.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    href="/host"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-purple-400 hover:text-purple-300 font-medium"
                  >
                    <span>Open Host Mode</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Admin Center Link */}
              <div className="dssa-card rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      ADMIN+
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white">Admin Center</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Attendance ledger, analytics, rooms &amp; CSV exports.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <span>Open Admin</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Development Role Assignment Information Box */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-2 text-xs text-zinc-300">
                <p className="font-semibold text-white">
                  Development &amp; Testing: Assigning User Roles
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  Roles are stored securely in Clerk user <code className="font-mono text-cyan-400">publicMetadata</code>.
                  To assign a test role in development, open your <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Clerk Dashboard</a> &rarr; <strong>Users</strong> &rarr; Select User &rarr; <strong>Public Metadata</strong> &rarr; Set:
                </p>
                <div className="rounded-lg bg-black/60 border border-white/10 p-2.5 font-mono text-xs text-emerald-400">
                  {'{ "role": "ADMIN" }'} <span className="text-zinc-500">{"// Values: SUPER_ADMIN, ADMIN, HOST, MEMBER, PENDING"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Return link */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              &larr; Return to Landing Page
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Manage account via:</span>
              <UserButton />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
