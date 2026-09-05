"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building,
  Calendar,
  ClipboardList,
  ScrollText,
  BarChart3,
  Shield,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Attendance", href: "/admin/attendance", icon: ClipboardList },
  { name: "Rooms", href: "/admin/rooms", icon: Building },
  { name: "Sessions", href: "/admin/sessions", icon: Calendar },
  { name: "Members", href: "/admin/members", icon: Users },
  { name: "Hosts", href: "/admin/hosts", icon: UserCheck },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5">
      <div className="space-y-6">
        {/* Brand / Title inside sidebar */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-950/40 text-blue-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-wider text-white">
                DSSA ADMIN
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                CONTROL CENTER
              </div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="space-y-1">
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-mono transition-all duration-150 ${
                  active
                    ? "border border-blue-500/30 bg-blue-950/30 text-blue-300 shadow-sm font-semibold"
                    : "text-zinc-400 hover:border hover:border-white/10 hover:bg-white/[0.03] hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active
                        ? "text-blue-400"
                        : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {active && <ChevronRight className="h-3.5 w-3.5 text-blue-400" />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer link to main app */}
      <div className="space-y-2 pt-4 border-t border-white/[0.06]">
        <Link
          href="/dashboard"
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-950/60 px-3 py-2 text-xs font-mono text-zinc-400 hover:border-white/20 hover:text-white transition-colors"
        >
          <span className="truncate">Member Dashboard</span>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16 lg:border-r lg:border-white/[0.08] lg:bg-[#030712]/95 lg:backdrop-blur-md z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-[#030712] border-r border-white/10 shadow-2xl z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
