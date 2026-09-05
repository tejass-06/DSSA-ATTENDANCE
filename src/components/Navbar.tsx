import Link from "next/link";
import { Shield, Sparkles, LayoutDashboard, LogIn } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export async function Navbar() {
  const { userId } = await auth();

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
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="https://dssa.scetngp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/50 hover:bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>DSSA Website</span>
          </a>

          {/* When User is Logged In */}
          {userId ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-950/60 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>

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
