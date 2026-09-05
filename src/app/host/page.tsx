import { requireRole } from "@/lib/auth/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Smartphone, QrCode, Users, ArrowLeft } from "lucide-react";

export default async function HostPage() {
  const user = await requireRole("HOST");

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-10 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-60" />

        <div className="relative mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs text-cyan-400 font-mono mb-2">
                <Smartphone className="h-3.5 w-3.5" />
                <span>HOST AUTHORIZATION VERIFIED</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                DSSA Host Mode
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Session Operator: <span className="font-semibold text-cyan-300">{user.name}</span> ({user.role})
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 px-3.5 py-2 text-xs font-mono text-zinc-300 transition-colors self-start sm:self-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Phase 3 Authorization Verification Card */}
          <div className="dssa-card rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-300 border-b border-white/[0.06] pb-3">
              HOST OPERATING BOUNDARY SPECIFICATION
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              This route is protected by server-side authorization requiring <code className="font-mono text-cyan-400">HOST</code>, <code className="font-mono text-blue-400">ADMIN</code>, or <code className="font-mono text-purple-400">SUPER_ADMIN</code>. Members and Pending accounts are rejected server-side.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <QrCode className="h-5 w-5 text-cyan-400 mb-2" />
                <h3 className="font-semibold text-sm text-white">Rotating QR Challenge</h3>
                <p className="mt-1 text-xs text-zinc-400">Hosts generate and display live rotating QR challenges for room attendees.</p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <Users className="h-5 w-5 text-emerald-400 mb-2" />
                <h3 className="font-semibold text-sm text-white">Realtime Headcount</h3>
                <p className="mt-1 text-xs text-zinc-400">Live monitoring of verified attendee check-ins during active sessions.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
