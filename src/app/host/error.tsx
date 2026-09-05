"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function HostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Host Mode Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-400">
        <AlertTriangle className="h-7 w-7 text-rose-400" />
      </div>

      <div className="text-center space-y-2 max-w-md">
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-rose-300">
          HOST OPERATION ERROR
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
          An error occurred while loading room configuration or session data. Please verify network connectivity and try again.
        </p>
      </div>

      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 text-xs font-mono text-white transition-colors cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
        <span>Reload Host Console</span>
      </button>
    </div>
  );
}
