import React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Radio, ArrowLeft } from "lucide-react";

interface HostHeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  hasActiveSession?: boolean;
}

export function HostHeader({ user, hasActiveSession = false }: HostHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-300 font-mono">
            <Radio className={`h-3.5 w-3.5 text-cyan-400 ${hasActiveSession ? "animate-pulse" : ""}`} />
            <span>{hasActiveSession ? "SESSION BROADCAST ACTIVE" : "HOST CONSOLE READY"}</span>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border bg-amber-950/40 text-amber-300 border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {user.role}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <span>Host Operations</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
          Operator: <span className="font-semibold text-white">{user.name}</span> ({user.email})
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 px-3.5 py-2 text-xs font-mono text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>

        <div className="flex items-center pl-2 border-l border-white/[0.08]">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-1 ring-cyan-500/30",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
