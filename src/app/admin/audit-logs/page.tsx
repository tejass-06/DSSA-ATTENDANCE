import React from "react";
import { prisma } from "@/lib/db";
import { ScrollText, Clock, Shield } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Logs | DSSA Admin",
  description: "View system audit trail and security events",
};

export default async function AdminAuditLogsPage() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 px-3 py-1 text-xs text-blue-300 font-mono mb-2">
            <ScrollText className="h-3.5 w-3.5 text-blue-400" />
            <span>SECURITY AUDIT TRAIL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            System Audit Logs
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Immutable log of administrative operations, session lifecycle events, and security actions.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Logged Events:</span>
          <span className="font-bold text-white text-sm">{auditLogs.length}</span>
        </div>
      </div>

      {/* Audit Logs Table */}
      {auditLogs.length === 0 ? (
        <AdminEmptyState
          title="No audit events recorded yet"
          description="Security, administrative, and session actions will be automatically recorded into this immutable audit trail."
          icon={<ScrollText className="h-6 w-6 text-zinc-500" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">Action</th>
                  <th className="py-3.5 px-4 sm:px-6">Actor</th>
                  <th className="py-3.5 px-4 sm:px-6">Entity</th>
                  <th className="py-3.5 px-4 sm:px-6">Entity ID</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                {auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 sm:px-6 text-cyan-300 font-semibold">
                      <span className="rounded bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-zinc-300">
                      {log.actor ? (
                        <div>
                          <div className="text-white font-sans font-medium">
                            {log.actor.name || log.actor.email}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {log.actor.role}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic font-sans">
                          System
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-zinc-300">
                      {log.entityType}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-zinc-400 truncate max-w-[140px]">
                      {log.entityId}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right text-zinc-400">
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        <span>
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Safety & Compliance Note */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 text-xs font-mono text-zinc-400 flex items-center gap-2.5">
        <Shield className="h-4 w-4 text-zinc-500 flex-shrink-0" />
        <span>
          Audit logs are non-destructively preserved with foreign key <code className="text-zinc-300 font-mono">onDelete: SetNull</code> to retain history if actor accounts are removed.
        </span>
      </div>
    </div>
  );
}
