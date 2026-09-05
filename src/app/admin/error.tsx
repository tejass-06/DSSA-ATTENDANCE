"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to client console in development
    console.error("Admin section error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-400">
        <AlertTriangle className="h-7 w-7 text-rose-400" />
      </div>

      <div className="text-center space-y-2 max-w-md">
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-rose-300">
          DATABASE CONNECTION ERROR
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
          An error occurred while fetching operational data. The database service may be undergoing maintenance or experiencing temporary latency.
        </p>
      </div>

      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 text-xs font-mono text-white transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
        <span>Retry Query</span>
      </button>
    </div>
  );
}
