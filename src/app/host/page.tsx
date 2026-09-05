import React from "react";
import { requireRole } from "@/lib/auth/server";
import { appRoleToPrismaRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { SessionStatus } from "@prisma/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HostHeader } from "@/components/host/HostHeader";
import { RoomSelector } from "@/components/host/RoomSelector";
import { ActiveSessionCard } from "@/components/host/ActiveSessionCard";
import { HostEmptyState } from "@/components/host/HostEmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Host Operations | DSSA Room Attendance",
  description: "Host operational control center for initiating and managing room attendance sessions",
};

export default async function HostPage() {
  // 1. Strict server-side authorization check (requires HOST, ADMIN, or SUPER_ADMIN)
  const authUser = await requireRole("HOST");

  // 2. Resolve database user ID
  const dbUserId = authUser.dbUserId;

  // 3. Query existing active session hosted by this user
  const activeSession = dbUserId
    ? await prisma.attendanceSession.findFirst({
        where: {
          hostUserId: dbUserId,
          status: SessionStatus.ACTIVE,
        },
        include: {
          room: true,
          host: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              records: true,
            },
          },
        },
      })
    : null;

  // 4. If no active session, query active rooms and check in-use conflicts
  let activeRooms: Array<{
    id: string;
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    isActive: boolean;
    isInUse: boolean;
  }> = [];

  if (!activeSession) {
    const [rooms, inUseSessions] = await Promise.all([
      prisma.room.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.attendanceSession.findMany({
        where: { status: SessionStatus.ACTIVE },
        select: { roomId: true },
      }),
    ]);

    const inUseRoomIds = new Set(inUseSessions.map((s) => s.roomId));

    activeRooms = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      radiusMeters: r.radiusMeters,
      isActive: r.isActive,
      isInUse: inUseRoomIds.has(r.id),
    }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-8 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-50" />

        <div className="relative mx-auto max-w-3xl space-y-6">
          {/* Host Header */}
          <HostHeader
            user={{
              name: authUser.name,
              email: authUser.email,
              role: authUser.role,
            }}
            hasActiveSession={!!activeSession}
          />

          {/* Body Content */}
          {activeSession ? (
            <ActiveSessionCard
              session={{
                id: activeSession.id,
                title: activeSession.title,
                status: activeSession.status,
                startsAt: activeSession.startsAt,
                room: {
                  id: activeSession.room.id,
                  name: activeSession.room.name,
                  code: activeSession.room.code,
                  radiusMeters: activeSession.room.radiusMeters,
                  latitude: Number(activeSession.room.latitude),
                  longitude: Number(activeSession.room.longitude),
                },
                host: {
                  name: activeSession.host.name,
                  email: activeSession.host.email,
                },
                attendeesCount: activeSession._count.records,
              }}
            />
          ) : activeRooms.length === 0 ? (
            <HostEmptyState
              title="No Active Rooms Configured"
              description="An administrator must configure at least one active room in the Admin Center before an attendance session can be initiated."
            />
          ) : (
            <RoomSelector rooms={activeRooms} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
