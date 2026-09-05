import React from "react";
import { prisma } from "@/lib/db";
import { AppRole } from "@prisma/client";
import { UserCheck, Calendar, Radio } from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Host Management | DSSA Admin",
  description: "View authorized DSSA attendance session hosts",
};

export default async function AdminHostsPage() {
  const hosts = await prisma.user.findMany({
    where: { role: AppRole.HOST },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clerkId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { hostedSessions: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-xs text-amber-300 font-mono mb-2">
            <UserCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>HOST REGISTRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Authorized Hosts
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Administrators and coordinators authorized to initiate room attendance sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Active Hosts:</span>
          <span className="font-bold text-white text-sm">{hosts.length}</span>
        </div>
      </div>

      {/* Hosts Table */}
      {hosts.length === 0 ? (
        <AdminEmptyState
          title="No hosts registered yet"
          description="Users with the HOST role will appear here once assigned and synced."
          icon={<UserCheck className="h-6 w-6 text-zinc-500" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">Host Name</th>
                  <th className="py-3.5 px-4 sm:px-6">Email Address</th>
                  <th className="py-3.5 px-4 sm:px-6">Role</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Hosted Sessions</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Authorized Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {hosts.map((host) => (
                  <tr
                    key={host.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-medium text-white">
                        {host.name || "Unnamed Host"}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[160px]">
                        ID: {host.id}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-zinc-300">
                      {host.email}
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <AdminBadge type={host.role} />
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center font-mono">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-1 text-amber-300">
                        <Radio className="h-3 w-3 text-amber-400" />
                        <span>{host._count.hostedSessions} sessions</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right font-mono text-zinc-400">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-zinc-500" />
                        <span>{new Date(host.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
