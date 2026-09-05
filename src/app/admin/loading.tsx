import React from "react";
import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-950/20 text-blue-400">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-mono text-xs font-semibold tracking-wider text-zinc-300">
          LOADING DATABASE DATA...
        </p>
        <p className="text-[11px] font-mono text-zinc-500">
          Querying MySQL via Prisma Client
        </p>
      </div>
    </div>
  );
}
