/**
 * DSSA Room Attendance System
 * POST /api/dev/qr-test — QR Cryptography & Security Edge Case Test (DEV ONLY)
 * Phase 9: Rotating QR Attendance System
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AppRole, SessionStatus } from "@prisma/client";
import {
  generateQRChallenge,
  validateQRChallenge,
  hashToken,
} from "@/lib/qr/service";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};
  const cleanup: (() => Promise<unknown>)[] = [];

  try {
    // ── Setup Fixtures ──────────────────────────────────────────────
    const hostA = await prisma.user.create({
      data: {
        clerkId: `test_host_a_${Date.now()}`,
        email: `host_a_${Date.now()}@dssa-test.local`,
        name: "Host Alpha (QR Test)",
        role: AppRole.HOST,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: hostA.id } }));

    const hostB = await prisma.user.create({
      data: {
        clerkId: `test_host_b_${Date.now()}`,
        email: `host_b_${Date.now()}@dssa-test.local`,
        name: "Host Beta (QR Test)",
        role: AppRole.HOST,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: hostB.id } }));

    const roomA = await prisma.room.create({
      data: {
        name: "Room Alpha",
        code: `RA-${Date.now()}`,
        latitude: 21.1458,
        longitude: 79.0882,
        radiusMeters: 50,
        isActive: true,
      },
    });
    cleanup.push(() => prisma.room.delete({ where: { id: roomA.id } }));

    const roomB = await prisma.room.create({
      data: {
        name: "Room Beta",
        code: `RB-${Date.now()}`,
        latitude: 21.1458,
        longitude: 79.0882,
        radiusMeters: 50,
        isActive: true,
      },
    });
    cleanup.push(() => prisma.room.delete({ where: { id: roomB.id } }));

    // Active session for Host A in Room A
    const activeSessionA = await prisma.attendanceSession.create({
      data: {
        roomId: roomA.id,
        hostUserId: hostA.id,
        title: "Session Alpha (Active)",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: activeSessionA.id } }));

    // Active session for Host B in Room B
    const activeSessionB = await prisma.attendanceSession.create({
      data: {
        roomId: roomB.id,
        hostUserId: hostB.id,
        title: "Session Beta (Active)",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: activeSessionB.id } }));

    // Scheduled session
    const scheduledSession = await prisma.attendanceSession.create({
      data: {
        roomId: roomA.id,
        hostUserId: hostA.id,
        title: "Scheduled Session",
        status: SessionStatus.SCHEDULED,
        startsAt: new Date(Date.now() + 3600000),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: scheduledSession.id } }));

    // Ended session
    const endedSession = await prisma.attendanceSession.create({
      data: {
        roomId: roomB.id,
        hostUserId: hostB.id,
        title: "Ended Session",
        status: SessionStatus.ENDED,
        startsAt: new Date(Date.now() - 3600000),
        endsAt: new Date(),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: endedSession.id } }));

    // ── Test 1: Generate challenge for active session ─────────────────
    const challengeA = await generateQRChallenge(activeSessionA.id);
    const validCheck1 = await validateQRChallenge(activeSessionA.id, challengeA.rawToken);
    results.test1_ownActiveSession = {
      passed: validCheck1.valid && !!challengeA.rawToken && challengeA.payload.includes("DSSA_ATT_V1"),
      ttlMs: challengeA.ttlMs,
    };

    // ── Test 2: SHA-256 hash stored in DB (not raw token) ────────────
    const storedRecord = await prisma.qRChallenge.findUnique({
      where: { challengeHash: hashToken(challengeA.rawToken) },
    });
    results.test2_hashStoredInDb = {
      passed: storedRecord !== null && storedRecord.challengeHash !== challengeA.rawToken,
    };

    // ── Test 3: Reject challenge generation for SCHEDULED session ─────
    let scheduledBlocked = false;
    try {
      await generateQRChallenge(scheduledSession.id);
    } catch {
      scheduledBlocked = true;
    }
    results.test3_scheduledSessionBlocked = { passed: scheduledBlocked };

    // ── Test 4: Reject challenge generation for ENDED session ─────────
    let endedBlocked = false;
    try {
      await generateQRChallenge(endedSession.id);
    } catch {
      endedBlocked = true;
    }
    results.test4_endedSessionBlocked = { passed: endedBlocked };

    // ── Test 5: Cross-session challenge mismatch ──────────────────────
    const crossCheck = await validateQRChallenge(activeSessionB.id, challengeA.rawToken);
    results.test5_crossSessionMismatch = {
      passed: !crossCheck.valid && crossCheck.error?.includes("SESSION_MISMATCH"),
    };

    // ── Test 6: Malformed / fake token rejected ───────────────────────
    const fakeCheck = await validateQRChallenge(activeSessionA.id, "fake_random_token_12345678");
    results.test6_malformedTokenRejected = {
      passed: !fakeCheck.valid && fakeCheck.error?.includes("INVALID_CHALLENGE"),
    };

    // ── Test 7: Expired challenge rejected ────────────────────────────
    // Create an expired challenge artificially in DB
    const expiredRawToken = "expired_test_token_9999999999999999999999";
    const expiredHash = hashToken(expiredRawToken);
    await prisma.qRChallenge.create({
      data: {
        sessionId: activeSessionA.id,
        challengeHash: expiredHash,
        issuedAt: new Date(Date.now() - 30000),
        expiresAt: new Date(Date.now() - 15000), // expired 15s ago
      },
    });
    cleanup.push(() => prisma.qRChallenge.delete({ where: { challengeHash: expiredHash } }));

    const expiredCheck = await validateQRChallenge(activeSessionA.id, expiredRawToken);
    results.test7_expiredChallengeRejected = {
      passed: !expiredCheck.valid && expiredCheck.error?.includes("CHALLENGE_EXPIRED"),
    };

    // ── Test 8: End active session & verify existing challenge fails ─
    await prisma.attendanceSession.update({
      where: { id: activeSessionA.id },
      data: { status: SessionStatus.ENDED, endsAt: new Date() },
    });
    const postEndCheck = await validateQRChallenge(activeSessionA.id, challengeA.rawToken);
    results.test8_endedSessionChallengeFails = {
      passed: !postEndCheck.valid && postEndCheck.error?.includes("SESSION_INACTIVE"),
    };

    // ── Test 9: Rapid rotation test ──────────────────────────────────
    const challengeB1 = await generateQRChallenge(activeSessionB.id);
    const challengeB2 = await generateQRChallenge(activeSessionB.id);
    const validB1 = await validateQRChallenge(activeSessionB.id, challengeB1.rawToken);
    const validB2 = await validateQRChallenge(activeSessionB.id, challengeB2.rawToken);
    results.test9_rapidRotationSafety = {
      passed: validB1.valid && validB2.valid && challengeB1.rawToken !== challengeB2.rawToken,
    };

    // ── Cleanup ──────────────────────────────────────────────────────
    await prisma.qRChallenge.deleteMany({
      where: {
        sessionId: {
          in: [activeSessionA.id, activeSessionB.id, scheduledSession.id, endedSession.id],
        },
      },
    });

    for (const fn of cleanup.reverse()) {
      try { await fn(); } catch { /* ignore */ }
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
