import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { auth } from "@clerk/nextjs/server";
import {
  Shield,
  QrCode,
  MapPin,
  Smartphone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Layers,
  Radio,
  Clock,
  Terminal,
  LayoutDashboard,
} from "lucide-react";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 dssa-grid-bg relative overflow-hidden">
        {/* Glow ambient gradients */}
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-70" />
        <div className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 -left-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-28 lg:px-8">
          {/* Top Tag */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1.5 text-xs text-emerald-300 backdrop-blur-md">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse-subtle" />
              <span className="font-mono font-medium tracking-wide">
                OFFICIAL DSSA SYSTEM &bull; SCET NGP
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 font-mono">
              <Terminal className="h-3 w-3 text-cyan-400" />
              <span>v1.0.0-phase-2-clerk</span>
            </div>
          </div>

          {/* Main Title & Tagline */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-block">
              <h2 className="font-mono text-xs sm:text-sm font-semibold tracking-widest text-emerald-400 uppercase mb-2">
                [ DSSA // ROOM ATTENDANCE PROTOCOL ]
              </h2>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-white">DSSA </span>
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Attendance System
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-zinc-300 font-light max-w-2xl mx-auto leading-relaxed">
              Room-based attendance management with dynamic cryptographic QR challenges and geofenced presence verification.
            </p>

            {/* Action buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              {userId ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-900/20 hover:from-emerald-400 hover:to-teal-500 transition-all duration-200 active:scale-[0.99] cursor-pointer"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>GO TO DASHBOARD</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-900/20 hover:from-emerald-400 hover:to-teal-500 transition-all duration-200 active:scale-[0.99] cursor-pointer"
                >
                  <span>GET STARTED</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              <a
                href="#security-architecture"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/80 px-6 py-3.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800/90 hover:border-white/25 transition-all"
              >
                <Layers className="h-4 w-4 text-zinc-400" />
                <span>Architecture Specs</span>
              </a>
            </div>

            {/* Micro summary tags */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Host Phone Interface
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Rotating QR Codes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Room Geofence Boundary
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Clerk Secure Auth
              </span>
            </div>
          </div>

          {/* Core System Flow Mockup Banner */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="dssa-card rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-xs text-zinc-400">attendance-protocol-flow.spec</span>
                </div>
                <span className="font-mono text-xs text-emerald-400/90 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  ROOM-BOUND
                </span>
              </div>

              {/* 3 Step Flow Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1: Admin Host */}
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-emerald-400 font-semibold">01 / ADMIN HOST</span>
                    <Smartphone className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-100">Launches Host Mode</h3>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Admin selects designated room on phone &amp; starts real-time attendance session with dynamic challenge generation.
                  </p>
                </div>

                {/* Step 2: Member Scan */}
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-cyan-400 font-semibold">02 / MEMBER SCAN</span>
                    <QrCode className="h-4 w-4 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-100">Scans Rotating QR</h3>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Member scans the rotating QR code displayed on the host screen using their own authenticated device.
                  </p>
                </div>

                {/* Step 3: Layered Verification */}
                <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-teal-400 font-semibold">03 / VERIFICATION</span>
                    <Shield className="h-4 w-4 text-teal-400" />
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-100">Multi-Layer Validation</h3>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Server evaluates session status, token freshness, room geofence radius, and unique attendance constraint.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Grid / Pillar Section */}
          <section id="security-architecture" className="mt-20 max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
                CORE SYSTEM CAPABILITIES
              </h2>
              <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                Engineered for strict room presence integrity
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1 */}
              <div className="dssa-card rounded-xl p-5 flex flex-col">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base text-zinc-100">Host Mode on Phone</h3>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed flex-1">
                  Admins start sessions, select rooms, display live QR challenges, and monitor real-time headcount entirely from a mobile device.
                </p>
                <div className="mt-4 pt-3 border-t border-white/[0.06] font-mono text-[11px] text-emerald-400">
                  #mobile-first-host
                </div>
              </div>

              {/* Card 2 */}
              <div className="dssa-card rounded-xl p-5 flex flex-col">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base text-zinc-100">Rotating QR Challenges</h3>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed flex-1">
                  Cryptographically generated challenges rotate at safe intervals, preventing proxy screenshot sharing and replay exploits.
                </p>
                <div className="mt-4 pt-3 border-t border-white/[0.06] font-mono text-[11px] text-cyan-400">
                  #anti-screenshot
                </div>
              </div>

              {/* Card 3 */}
              <div className="dssa-card rounded-xl p-5 flex flex-col">
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base text-zinc-100">Geofence Validation</h3>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed flex-1">
                  Server-side distance calculation ensures the member&apos;s device is physically inside the designated room radius (e.g. 50m).
                </p>
                <div className="mt-4 pt-3 border-t border-white/[0.06] font-mono text-[11px] text-teal-400">
                  #location-bound
                </div>
              </div>

              {/* Card 4 */}
              <div className="dssa-card rounded-xl p-5 flex flex-col">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base text-zinc-100">Layered Anti-Proxy</h3>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed flex-1">
                  Combines Clerk authentication, database unique constraints, device tracking signals, and tamper-proof audit trails.
                </p>
                <div className="mt-4 pt-3 border-t border-white/[0.06] font-mono text-[11px] text-blue-400">
                  #layered-defense
                </div>
              </div>
            </div>
          </section>

          {/* Development Roadmap / Phased Architecture Indicator */}
          <section className="mt-20 max-w-4xl mx-auto rounded-2xl border border-white/10 bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <span className="font-mono text-xs text-emerald-400 font-semibold tracking-wider uppercase">
                  Development Status
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Phase 2: Clerk Authentication Active</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-xs text-emerald-400 font-medium">
                  PHASE 2 READY
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              <p>
                Official Clerk authentication is configured. Member and Admin sessions are securely managed via server-side Clerk middleware and session tokens.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Clerk Next.js Integration</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Protected Dashboard Route</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Integrated Sign-In &amp; Sign-Up UI</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Server-Side User Identity Retrieval</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
