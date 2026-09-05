/**
 * DSSA Room Attendance System
 * POST /api/dev/db-test — Relationship verification (DEVELOPMENT ONLY)
 * Phase 5: Database Models & Relationships
 *
 * This endpoint:
 *  1. Creates a test User, Room, AttendanceSession, QRChallenge, AttendanceRecord
 *  2. Verifies all relations can be queried
 *  3. Verifies the @@unique([sessionId, userId]) constraint on AttendanceRecord
 *  4. Cleans up ALL test data (deletes in dependency order)
 *
 * SECURITY: Disabled in production via NODE_ENV guard.
 * Do NOT expose this route in production builds.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppRole, SessionStatus, AttendanceStatus } from "@prisma/client";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const cleanup: (() => Promise<unknown>)[] = [];

  try {
    // ── 1. Create test User ──────────────────────────────────────────
    const testUser = await prisma.user.create({
      data: {
        clerkId: `test_clerk_${Date.now()}`,
        email: `test_${Date.now()}@dssa-test.local`,
        name: "Test User (Phase 5)",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: testUser.id } }));
    results.user = { id: testUser.id, role: testUser.role };

    // ── 2. Create test Room ──────────────────────────────────────────
    const testRoom = await prisma.room.create({
      data: {
        name: "Test Room (Phase 5)",
        code: `TEST-ROOM-${Date.now()}`,
        latitude: 21.1458,
        longitude: 79.0882,
        radiusMeters: 50,
        isActive: true,
      },
    });
    cleanup.push(() => prisma.room.delete({ where: { id: testRoom.id } }));
    results.room = { id: testRoom.id, code: testRoom.code };

    // ── 3. Create test AttendanceSession ─────────────────────────────
    const testSession = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: testUser.id,
        title: "Test Session (Phase 5)",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    cleanup.push(() =>
      prisma.attendanceSession.delete({ where: { id: testSession.id } })
    );
    results.session = { id: testSession.id, status: testSession.status };

    // ── 4. Create test QRChallenge ───────────────────────────────────
    const testQr = await prisma.qRChallenge.create({
      data: {
        sessionId: testSession.id,
        challengeHash: `sha256_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 30_000), // 30 seconds from now
      },
    });
    cleanup.push(() =>
      prisma.qRChallenge.delete({ where: { id: testQr.id } })
    );
    results.qrChallenge = { id: testQr.id, expiresAt: testQr.expiresAt };

    // ── 5. Create test AttendanceRecord ──────────────────────────────
    const testRecord = await prisma.attendanceRecord.create({
      data: {
        sessionId: testSession.id,
        userId: testUser.id,
        status: AttendanceStatus.PRESENT,
      },
    });
    cleanup.push(() =>
      prisma.attendanceRecord.delete({ where: { id: testRecord.id } })
    );
    results.attendanceRecord = { id: testRecord.id, status: testRecord.status };

    // ── 6. Verify @@unique([sessionId, userId]) constraint ────────────
    let duplicateBlocked = false;
    try {
      await prisma.attendanceRecord.create({
        data: {
          sessionId: testSession.id,
          userId: testUser.id,
          status: AttendanceStatus.PRESENT,
        },
      });
    } catch {
      duplicateBlocked = true; // expected: unique constraint violation
    }
    results.uniqueConstraintEnforced = duplicateBlocked;

    // ── 7. Verify relation queries ───────────────────────────────────
    const sessionWithRelations = await prisma.attendanceSession.findUnique({
      where: { id: testSession.id },
      include: {
        room: true,
        host: true,
        records: { include: { user: true } },
        qrChallenges: true,
      },
    });
    results.relations = {
      hasRoom: !!sessionWithRelations?.room,
      hasHost: !!sessionWithRelations?.host,
      recordCount: sessionWithRelations?.records.length ?? 0,
      qrChallengeCount: sessionWithRelations?.qrChallenges.length ?? 0,
    };

    // ── 8. Cleanup — delete in reverse dependency order ──────────────
    for (const fn of cleanup.reverse()) {
      await fn();
    }
    results.cleanup = "completed";

    return NextResponse.json({ passed: true, results }, { status: 200 });
  } catch (error) {
    // Emergency cleanup on failure — best effort
    for (const fn of cleanup.reverse()) {
      try { await fn(); } catch { /* ignore cleanup errors */ }
    }

    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ passed: false, error: message, results }, { status: 500 });
  }
}
