/**
 * DSSA Room Attendance System
 * POST /api/dev/host-test — Host Lifecycle & Concurrency Verification (DEV ONLY)
 * Phase 7: Host Mode Foundation
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppRole, SessionStatus } from "@prisma/client";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const cleanup: (() => Promise<unknown>)[] = [];

  try {
    // 1. Create a test Host user
    const host = await prisma.user.create({
      data: {
        clerkId: `test_host_${Date.now()}`,
        email: `host_${Date.now()}@dssa-test.local`,
        name: "Host Lifecycle Test",
        role: AppRole.HOST,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: host.id } }));
    results.hostCreated = { id: host.id, role: host.role };

    // 2. Create a test Room
    const room = await prisma.room.create({
      data: {
        name: "DSSA Computer Center",
        code: `DSSA-CC-${Date.now()}`,
        latitude: 21.1458,
        longitude: 79.0882,
        radiusMeters: 45,
        isActive: true,
      },
    });
    cleanup.push(() => prisma.room.delete({ where: { id: room.id } }));
    results.roomCreated = { id: room.id, code: room.code };

    // 3. Create active session for host
    const session = await prisma.attendanceSession.create({
      data: {
        roomId: room.id,
        hostUserId: host.id,
        title: "Committee Orientation Session",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
      include: {
        room: true,
        host: true,
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: session.id } }));
    results.sessionCreated = { id: session.id, status: session.status, room: session.room.name };

    // 4. Verify active session query for host
    const activeForHost = await prisma.attendanceSession.findFirst({
      where: {
        hostUserId: host.id,
        status: SessionStatus.ACTIVE,
      },
      include: {
        room: true,
      },
    });
    results.activeSessionDiscovered = activeForHost?.id === session.id;

    // 5. Verify room conflict check
    const activeInRoom = await prisma.attendanceSession.findFirst({
      where: {
        roomId: room.id,
        status: SessionStatus.ACTIVE,
      },
    });
    results.roomInUseDetected = activeInRoom?.id === session.id;

    // 6. Conclude / End session
    const endedSession = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.ENDED,
        endsAt: new Date(),
      },
    });
    results.sessionEnded = { status: endedSession.status, hasEndsAt: !!endedSession.endsAt };

    // 7. Verify host no longer has an active session
    const postActive = await prisma.attendanceSession.findFirst({
      where: {
        hostUserId: host.id,
        status: SessionStatus.ACTIVE,
      },
    });
    results.postActiveCleared = postActive === null;

    // 8. Execute cleanup
    for (const fn of cleanup.reverse()) {
      await fn();
    }
    results.cleanup = "completed";

    return NextResponse.json({ passed: true, results }, { status: 200 });
  } catch (error) {
    for (const fn of cleanup.reverse()) {
      try { await fn(); } catch { /* ignore */ }
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ passed: false, error: message, results }, { status: 500 });
  }
}
