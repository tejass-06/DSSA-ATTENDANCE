import React from "react";
import { prisma } from "@/lib/db";
import { Building, MapPin, Radio, Calendar } from "lucide-react";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Room Registry | DSSA Admin",
  description: "View configured physical rooms and geofencing coordinates",
};

export default async function AdminRoomsPage() {
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { sessions: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1 text-xs text-purple-300 font-mono mb-2">
            <Building className="h-3.5 w-3.5 text-purple-400" />
            <span>ROOM & GEOFENCE REGISTRY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Configured Rooms
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Physical meeting venues with registered GPS coordinates and allowed verification radius.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Registered Rooms:</span>
          <span className="font-bold text-white text-sm">{rooms.length}</span>
        </div>
      </div>

      {/* Rooms Table */}
      {rooms.length === 0 ? (
        <AdminEmptyState
          title="No rooms configured yet"
          description="Physical meeting rooms with geofencing boundaries will be displayed here."
          icon={<Building className="h-6 w-6 text-zinc-500" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4 sm:px-6">Room Name</th>
                  <th className="py-3.5 px-4 sm:px-6">Room Code</th>
                  <th className="py-3.5 px-4 sm:px-6">GPS Coordinates</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Radius</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Total Sessions</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {rooms.map((room) => {
                  const latStr = Number(room.latitude).toFixed(6);
                  const lngStr = Number(room.longitude).toFixed(6);

                  return (
                    <tr
                      key={room.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-medium text-white">{room.name}</div>
                        <div className="font-mono text-[10px] text-zinc-500 truncate max-w-[140px]">
                          ID: {room.id}
                        </div>
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-cyan-300">
                        <span className="rounded bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5">
                          {room.code}
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-mono text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                          <span>
                            {latStr}, {lngStr}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-center font-mono text-zinc-400">
                        <span className="rounded-md bg-zinc-900 px-2 py-1">
                          {room.radiusMeters}m
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-center font-mono text-zinc-300">
                        <span className="inline-flex items-center gap-1">
                          <Radio className="h-3 w-3 text-purple-400" />
                          <span>{room._count.sessions}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <AdminBadge
                          type={room.isActive ? "ACTIVE_ROOM" : "INACTIVE_ROOM"}
                          label={room.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right font-mono text-zinc-400">
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-zinc-500" />
                          <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
