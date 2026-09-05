"use client";

import React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Menu, ArrowLeft, ShieldCheck } from "lucide-react";
import { AdminBadge } from "./AdminBadge";

interface AdminHeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  onMenuToggle?: () => void;
}

export function AdminHeader({ user, onMenuToggle }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#030712]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8">
      {/* Left side: Mobile menu toggle + Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 px-2.5 py-0.5 text-[11px] font-mono text-blue-300">
            <ShieldCheck className="h-3 w-3 text-blue-400" />
            <span>ADMIN CONSOLE</span>
          </div>
          <AdminBadge type={user.role} />
        </div>
      </div>

      {/* Right side: Back link + User info + Clerk UserButton */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/dashboard"
          className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/50 hover:bg-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit to App</span>
        </Link>

        <div className="hidden sm:block text-right">
          <div className="text-xs font-medium text-white leading-tight">
            {user.name}
          </div>
          <div className="text-[10px] font-mono text-zinc-400 leading-tight truncate max-w-[140px]">
            {user.email}
          </div>
        </div>

        <div className="flex items-center pl-1 border-l border-white/[0.08]">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-1 ring-white/20",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
