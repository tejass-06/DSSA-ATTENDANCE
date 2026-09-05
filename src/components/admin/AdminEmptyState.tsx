import React, { ReactNode } from "react";
import { Database } from "lucide-react";

interface AdminEmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionText?: string;
  actionHref?: string;
}

export function AdminEmptyState({
  title,
  description,
  icon,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 p-10 sm:p-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/80 text-zinc-400 mb-4">
        {icon || <Database className="h-6 w-6 text-zinc-500" />}
      </div>
      <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-300">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-xs text-zinc-500 font-sans leading-relaxed">
        {description}
      </p>
    </div>
  );
}
