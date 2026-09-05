import { requireRole } from "@/lib/auth/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, QrCode, Sparkles, MapPin, Lock } from "lucide-react";
import { QRScanner } from "@/components/attendance/QRScanner";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await requireRole("MEMBER");

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-8 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-60" />

        <div className="relative mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400 font-mono mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>MEMBER ATTENDANCE PORTAL</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <QrCode className="h-7 w-7 text-emerald-400" />
                <span>Mark Attendance</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                Attendee: <span className="font-semibold text-emerald-300">{user.name}</span> ({user.role})
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

          {/* Real Camera QR Scanner */}
          <QRScanner userName={user.name} userRole={user.role} />

          {/* Security & System Info Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="h-4 w-4" />
                <h3 className="font-semibold text-xs text-white">Rotating QR Security</h3>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tokens rotate dynamically on host screens. Expired or duplicate QR tokens are rejected.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400">
                <Lock className="h-4 w-4" />
                <h3 className="font-semibold text-xs text-white">Server Authority</h3>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Timestamps, member identity, and attendance records are strictly verified and created on the server.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-400">
                <MapPin className="h-4 w-4" />
                <h3 className="font-semibold text-xs text-white">Geofencing Ready</h3>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Location validation will be introduced in subsequent phases for physical room bounds verification.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
