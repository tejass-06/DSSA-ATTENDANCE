import React, { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface AdminStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: ReactNode;
  accentColor?: "emerald" | "cyan" | "blue" | "purple" | "amber" | "rose";
  href?: string;
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = "cyan",
  href,
}: AdminStatCardProps) {
  const colorMap = {
    emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-950/20 group-hover:border-emerald-500/40",
    cyan: "border-cyan-500/20 text-cyan-400 bg-cyan-950/20 group-hover:border-cyan-500/40",
    blue: "border-blue-500/20 text-blue-400 bg-blue-950/20 group-hover:border-blue-500/40",
    purple: "border-purple-500/20 text-purple-400 bg-purple-950/20 group-hover:border-purple-500/40",
    amber: "border-amber-500/20 text-amber-400 bg-amber-950/20 group-hover:border-amber-500/40",
    rose: "border-rose-500/20 text-rose-400 bg-rose-950/20 group-hover:border-rose-500/40",
  };

  const cardContent = (
    <div className={`group relative rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm p-5 sm:p-6 transition-all duration-200 hover:border-white/20 hover:bg-[#0b0f19] ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border transition-colors ${colorMap[accentColor]}`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
          {value}
        </div>
        {href && (
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-cyan-400 transition-colors">
            <span>View</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-zinc-500 font-sans">{subtitle}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}
