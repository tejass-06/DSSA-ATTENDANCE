import Link from "next/link";
import { Shield, Sparkles, LayoutDashboard, LogIn, QrCode, Smartphone, Settings } from "lucide-react";
import { getCurrentUserWithRole } from "@/lib/auth/server";
import { hasMinimumRole, ROLE_METADATA_CONFIG } from "@/lib/auth/roles";
import { UserButton } from "@clerk/nextjs";

export async function Navbar() {
  const user = await getCurrentUserWithRole();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#030712]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold tracking-wider text-base text-white">DSSA</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                SCET NGP
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 tracking-tight">Room Attendance System</span>
          </div>
        </Link>

        {/* Navigation & Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://dssa.scetngp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/50 hover:bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300 transition-colors mr-1"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>DSSA Website</span>
          </a>

          {/* When User is Logged In */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Role Badge */}
              <span className={`hidden sm:inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded border ${ROLE_METADATA_CONFIG[user.role].badgeClass}`}>
                {user.role}
              </span>

              {/* Navigation links based on role */}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>

              {hasMinimumRole(user.role, "MEMBER") && (
                <Link
                  href="/attendance"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-950/40 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-colors"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Attendance</span>
                </Link>
              )}

              {hasMinimumRole(user.role, "HOST") && (
                <Link
                  href="/host"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-950/40 px-2.5 py-1.5 text-xs font-medium text-cyan-300 transition-colors"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Host</span>
                </Link>
              )}

              {hasMinimumRole(user.role, "ADMIN") && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-950/20 hover:bg-blue-950/40 px-2.5 py-1.5 text-xs font-medium text-blue-300 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              )}

              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8 ring-1 ring-emerald-500/40",
                  },
                }}
              />
            </div>
          ) : (
            /* When User is Logged Out */
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <LogIn className="h-3.5 w-3.5 text-emerald-400" />
              <span>SIGN IN</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
