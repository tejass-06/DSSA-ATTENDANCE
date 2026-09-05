import React from "react";
import { prisma } from "@/lib/db";
import { AppRole } from "@prisma/client";
import { Users, Shield, Calendar } from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member Directory | DSSA Admin",
  description: "View registered DSSA committee members",
};

export default async function AdminMembersPage() {
  const members = await prisma.user.findMany({
    where: { role: AppRole.MEMBER },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clerkId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { attendanceRecords: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-300 font-mono mb-2">
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            <span>MEMBER DIRECTORY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Committee Members
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Read-only registry of authenticated members with <code className="font-mono text-cyan-400">MEMBER</code> role.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Total Members:</span>
          <span className="font-bold text-white text-sm">{members.length}</span>
        </div>
      </div>

      {/* Members Table */}
      {members.length === 0 ? (
        <AdminEmptyState
          title="No members registered yet"
          description="Users will appear in this directory once assigned the MEMBER role in Clerk and synchronized."
          icon={<Users className="h-6 w-6 text-zinc-500" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">Member Name</th>
                  <th className="py-3.5 px-4 sm:px-6">Email Address</th>
                  <th className="py-3.5 px-4 sm:px-6">Role</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Attendance Count</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-medium text-white">
                        {member.name || "Unnamed Member"}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[160px]">
                        ID: {member.id}
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-mono text-zinc-300">
                      {member.email}
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <AdminBadge type={member.role} />
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center font-mono">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-2 py-1 text-zinc-300">
                        {member._count.attendanceRecords} records
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right font-mono text-zinc-400">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-zinc-500" />
                        <span>{new Date(member.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security & Read-Only Notice */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-4 text-xs font-mono text-zinc-400 flex items-center gap-2.5">
        <Shield className="h-4 w-4 text-zinc-500 flex-shrink-0" />
        <span>
          Read-only view. Member role modifications and promotion workflows are managed in subsequent phases.
        </span>
      </div>
    </div>
  );
}
