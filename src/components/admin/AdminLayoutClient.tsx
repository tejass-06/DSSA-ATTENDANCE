"use client";

import React, { useState, ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminLayoutClientProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  children: ReactNode;
}

export function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Sidebar Component */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area (Offset for desktop sidebar) */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        <AdminHeader
          user={user}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 dssa-grid-bg relative p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-50" />
          <div className="relative mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
