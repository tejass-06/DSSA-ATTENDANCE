import React from "react";
import { prisma } from "@/lib/db";
import { Building } from "lucide-react";
import { RoomManager, RoomItem } from "@/components/admin/RoomManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Room Registry & Management | DSSA Admin",
  description: "Configure and manage physical venues, geofence radius, and boundary coordinates",
};

export default async function AdminRoomsPage() {
  const roomsData = await prisma.room.findMany({
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

  const rooms: RoomItem[] = roomsData.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    radiusMeters: r.radiusMeters,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    _count: {
      sessions: r._count.sessions,
    },
  }));

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
            Room Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Configure physical meeting rooms, registered GPS centers, and authorized geofencing radius.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-mono text-xs text-zinc-300 self-start sm:self-auto">
          <span>Registered Venues:</span>
          <span className="font-bold text-white text-sm">{rooms.length}</span>
        </div>
      </div>

      {/* Room Manager Component */}
      <RoomManager initialRooms={rooms} />
    </div>
  );
}
