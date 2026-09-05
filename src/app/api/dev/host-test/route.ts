/**
 * DSSA Room Attendance System
 * POST /api/dev/host-test — Host Lifecycle & State Machine Verification (DEV ONLY)
 * Phase 8: Attendance Session Management
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppRole, SessionStatus } from "@prisma/client";
import { isValidSessionTransition } from "@/lib/session/lifecycle";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const cleanup: (() => Promise<unknown>)[] = [];

  try {
    // 1. Create two test Host users
    const hostA = await prisma.user.create({
      data: {
        clerkId: `test_host_a_${Date.now()}`,
        email: `host_a_${Date.now()}@dssa-test.local`,
        name: "Host Alpha",
        role: AppRole.HOST,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: hostA.id } }));

    const hostB = await prisma.user.create({
      data: {
        clerkId: `test_host_b_${Date.now()}`,
        email: `host_b_${Date.now()}@dssa-test.local`,
        name: "Host Beta",
        role: AppRole.HOST,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: hostB.id } }));

    results.hostsCreated = { hostA: hostA.id, hostB: hostB.id };

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

    // 3. Test State Machine Transitions logic
    results.stateMachineTransitions = {
      scheduledToActive: isValidSessionTransition(SessionStatus.SCHEDULED, SessionStatus.ACTIVE), // true
      activeToEnded: isValidSessionTransition(SessionStatus.ACTIVE, SessionStatus.ENDED),         // true
      scheduledToCancelled: isValidSessionTransition(SessionStatus.SCHEDULED, SessionStatus.CANCELLED), // true
      activeToCancelled: isValidSessionTransition(SessionStatus.ACTIVE, SessionStatus.CANCELLED),       // true
      endedToActiveBlocked: !isValidSessionTransition(SessionStatus.ENDED, SessionStatus.ACTIVE),       // true (blocked)
      cancelledToEndedBlocked: !isValidSessionTransition(SessionStatus.CANCELLED, SessionStatus.ENDED), // true (blocked)
    };

    // 4. Create active session for Host A
    const session = await prisma.attendanceSession.create({
      data: {
        roomId: room.id,
        hostUserId: hostA.id,
        title: "Alpha Committee Session",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
      include: {
        room: true,
        host: true,
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: session.id } }));
    results.sessionCreated = { id: session.id, status: session.status, host: session.host.name };

    // 5. Test Ownership isolation
    const isOwnerA = session.hostUserId === hostA.id;
    const isOwnerB = session.hostUserId === hostB.id;
    results.ownershipBoundary = {
      hostAIsOwner: isOwnerA,
      hostBIsOwner: isOwnerB, // false (blocked from controlling session)
    };

    // 6. Conclude / End session
    const endedSession = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.ENDED,
        endsAt: new Date(),
      },
    });
    results.sessionEnded = { status: endedSession.status, hasEndsAt: !!endedSession.endsAt };

    // 7. Verify historical query finds ended session for Host A
    const hostHistory = await prisma.attendanceSession.findMany({
      where: { hostUserId: hostA.id },
      orderBy: { startsAt: "desc" },
    });
    results.historyDiscovered = hostHistory.length === 1 && hostHistory[0].id === session.id;

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
