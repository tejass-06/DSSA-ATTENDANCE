import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ShieldAlert, ArrowLeft, Lock, UserCheck } from "lucide-react";

interface UnauthorizedPageProps {
  searchParams: Promise<{
    required?: string;
    current?: string;
  }>;
}

export default async function UnauthorizedPage({ searchParams }: UnauthorizedPageProps) {
  const params = await searchParams;
  const requiredRole = params.required || "ELEVATED_ROLE";
  const currentRole = params.current || "PENDING";

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        {/* Glow warning effect */}
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-50" />
        <div className="pointer-events-none absolute top-1/4 h-80 w-80 rounded-full bg-red-500/10 blur-[120px]" />

        <div className="relative w-full max-w-lg space-y-6">
          <div className="dssa-card rounded-2xl p-6 sm:p-8 text-center space-y-6 border border-red-500/20 shadow-2xl">
            {/* Warning Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-950/30 px-3 py-1 text-xs text-red-400 font-mono">
                <Lock className="h-3.5 w-3.5" />
                <span>403 FORBIDDEN &bull; INSUFFICIENT PRIVILEGES</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Access Restricted
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                Your authenticated account does not possess the authorization level required to access this resource.
              </p>
            </div>

            {/* Role Context Box */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/70 p-4 text-left font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">YOUR CURRENT ROLE:</span>
                <span className="text-amber-400 font-semibold">{currentRole}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                <span className="text-zinc-500">REQUIRED ROLE:</span>
                <span className="text-emerald-400 font-semibold">{requiredRole}</span>
              </div>
            </div>

            {/* Guidance for Pending Users */}
            {currentRole === "PENDING" && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 text-xs text-zinc-300 text-left flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your account is in <span className="text-amber-300 font-semibold">PENDING</span> status. A DSSA administrator must assign you a role (MEMBER, HOST, or ADMIN) in the Clerk dashboard before accessing protected committee features.
                </p>
              </div>
            )}

            {/* Back to Dashboard */}
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-5 py-3 text-xs font-mono text-zinc-200 transition-colors w-full"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>RETURN TO DASHBOARD</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
