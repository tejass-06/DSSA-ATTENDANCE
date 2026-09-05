/**
 * DSSA Room Attendance System
 * Dedicated Anti-Proxy Hardening & Security Testing Endpoint
 * GET /api/dev/anti-proxy-test
 * Phase 14: Advanced Anti-Proxy Hardening
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SessionStatus, AppRole as PrismaAppRole } from "@prisma/client";
import { processAttendanceSubmission } from "@/lib/attendance/service";
import { QR_PROTOCOL_PREFIX } from "@/lib/qr/config";
import { globalRateLimiter } from "@/lib/security/rateLimiter";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface TestResult {
  testId: number;
  testName: string;
  scenario: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: Record<string, unknown>;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Development test routes are disabled in production." },
      { status: 403 }
    );
  }

  const results: TestResult[] = [];
  const testRunId = `anti_proxy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Reset rate limiter cache before test suite execution
  globalRateLimiter.resetAll();

  // Baseline Room: SCET Nagpur Room 101 (21.1145000, 79.0560000, radius 30m)
  const room = await prisma.room.create({
    data: {
      name: `Anti-Proxy Test Room ${testRunId}`,
      code: `RM-AP-${Date.now().toString().slice(-6)}`,
      latitude: 21.1145,
      longitude: 79.056,
      radiusMeters: 30,
      isActive: true,
    },
  });

  // Host User
  const hostUser = await prisma.user.create({
    data: {
      clerkId: `clerk_host_${testRunId}`,
      email: `host_${testRunId}@scetngp.edu`,
      name: `Host ${testRunId}`,
      role: PrismaAppRole.HOST,
    },
  });

  // Test Member 1
  const member1 = await prisma.user.create({
    data: {
      clerkId: `clerk_m1_${testRunId}`,
      email: `m1_${testRunId}@scetngp.edu`,
      name: `Member 1 ${testRunId}`,
      role: PrismaAppRole.MEMBER,
    },
  });

  // Test Member 2
  const member2 = await prisma.user.create({
    data: {
      clerkId: `clerk_m2_${testRunId}`,
      email: `m2_${testRunId}@scetngp.edu`,
      name: `Member 2 ${testRunId}`,
      role: PrismaAppRole.MEMBER,
    },
  });

  // Pending Member
  const pendingMember = await prisma.user.create({
    data: {
      clerkId: `clerk_pending_${testRunId}`,
      email: `pending_${testRunId}@scetngp.edu`,
      name: `Pending ${testRunId}`,
      role: PrismaAppRole.PENDING,
    },
  });

  // Active Session
  const session = await prisma.attendanceSession.create({
    data: {
      roomId: room.id,
      hostUserId: hostUser.id,
      title: `Anti-Proxy Hardening Session ${testRunId}`,
      status: SessionStatus.ACTIVE,
      startsAt: new Date(),
    },
  });

  // Helper to generate a valid QR challenge in MySQL with strict hex token
  async function createTestChallenge(targetSessionId: string, ttlMs: number = 30_000) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const challengeHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + ttlMs);

    await prisma.qRChallenge.create({
      data: {
        sessionId: targetSessionId,
        challengeHash,
        expiresAt,
      },
    });

    const payload = JSON.stringify({
      v: QR_PROTOCOL_PREFIX,
      sid: targetSessionId,
      token: rawToken,
      iat: Date.now(),
      exp: expiresAt.getTime(),
    });

    return { rawToken, challengeHash, payload };
  }

  // Inside location: ~4 meters from room center
  const insideLocation = {
    latitude: 21.11453,
    longitude: 79.05602,
    accuracy: 8,
  };

  // Outside location: ~100 meters away
  const outsideLocation = {
    latitude: 21.1154,
    longitude: 79.056,
    accuracy: 10,
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Normal member attendance -> Success
    // -------------------------------------------------------------
    const chal1 = await createTestChallenge(session.id);
    const res1 = await processAttendanceSubmission(
      { userId: member1.clerkId, role: "MEMBER", email: member1.email, name: member1.name! },
      chal1.payload,
      insideLocation
    );

    results.push({
      testId: 1,
      testName: "Normal Member Attendance",
      scenario: "Valid authenticated member with valid rotating QR and inside location",
      expected: "success=true, alreadyMarked=false, status=PRESENT",
      actual: `success=${res1.success}, alreadyMarked=${res1.alreadyMarked}, status=${res1.record?.status}`,
      passed: res1.success === true && res1.alreadyMarked === false && res1.record?.status === "PRESENT",
    });

    // -------------------------------------------------------------
    // Test 2: Second attendance for same session -> Duplicate
    // -------------------------------------------------------------
    const chal2 = await createTestChallenge(session.id);
    const res2 = await processAttendanceSubmission(
      { userId: member1.clerkId, role: "MEMBER", email: member1.email, name: member1.name! },
      chal2.payload,
      insideLocation
    );

    results.push({
      testId: 2,
      testName: "Duplicate Attendance Protection",
      scenario: "Member attempts second submission for the same active session",
      expected: "success=true, alreadyMarked=true",
      actual: `success=${res2.success}, alreadyMarked=${res2.alreadyMarked}`,
      passed: res2.success === true && res2.alreadyMarked === true,
    });

    // -------------------------------------------------------------
    // Test 3: 10 rapid concurrent requests -> At most one record
    // -------------------------------------------------------------
    const member3 = await prisma.user.create({
      data: {
        clerkId: `clerk_m3_${testRunId}`,
        email: `m3_${testRunId}@scetngp.edu`,
        name: `Member 3 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    const chal3 = await createTestChallenge(session.id);
    // Submit 10 concurrent requests
    const res3Promises = Array.from({ length: 10 }, () =>
      processAttendanceSubmission(
        { userId: member3.clerkId, role: "MEMBER", email: member3.email, name: member3.name! },
        chal3.payload,
        insideLocation
      )
    );
    const res3List = await Promise.all(res3Promises);
    const res3Success = res3List.filter((r) => r.success && !r.alreadyMarked).length;
    const res3Duplicates = res3List.filter((r) => r.success && r.alreadyMarked).length;

    const countM3 = await prisma.attendanceRecord.count({
      where: { sessionId: session.id, userId: member3.id },
    });

    results.push({
      testId: 3,
      testName: "10 Rapid Submissions Race",
      scenario: "10 rapid parallel submissions for same user & session",
      expected: "DB count=1, exactly 1 created, others duplicate or rate limited",
      actual: `DB count=${countM3}, new=${res3Success}, dup=${res3Duplicates}`,
      passed: countM3 === 1 && res3Success === 1,
    });

    // -------------------------------------------------------------
    // Test 4: 100 rapid requests / abuse -> Rate limiting engages
    // -------------------------------------------------------------
    const member4 = await prisma.user.create({
      data: {
        clerkId: `clerk_m4_${testRunId}`,
        email: `m4_${testRunId}@scetngp.edu`,
        name: `Member 4 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    const chal4 = await createTestChallenge(session.id);
    let rateLimitedCount = 0;
    let successOrDupCount = 0;

    for (let i = 0; i < 30; i++) {
      const r = await processAttendanceSubmission(
        { userId: member4.clerkId, role: "MEMBER", email: member4.email, name: member4.name! },
        chal4.payload,
        insideLocation
      );
      if (r.errorCode === "RATE_LIMITED") {
        rateLimitedCount++;
      } else if (r.success) {
        successOrDupCount++;
      }
    }

    results.push({
      testId: 4,
      testName: "Automated Hammering Rate Limiter",
      scenario: "30 rapid requests from single user exceeds burst threshold",
      expected: "Rate limiting engages (errorCode=RATE_LIMITED)",
      actual: `success/dup=${successOrDupCount}, rateLimited=${rateLimitedCount}`,
      passed: rateLimitedCount > 0,
    });

    // -------------------------------------------------------------
    // Test 5: Repeated malformed QR submissions -> Safe rejection
    // -------------------------------------------------------------
    const member5 = await prisma.user.create({
      data: {
        clerkId: `clerk_m5_${testRunId}`,
        email: `m5_${testRunId}@scetngp.edu`,
        name: `Member 5 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    const res5 = await processAttendanceSubmission(
      { userId: member5.clerkId, role: "MEMBER", email: member5.email, name: member5.name! },
      "{ not valid json }",
      insideLocation
    );

    results.push({
      testId: 5,
      testName: "Malformed QR Abuse",
      scenario: "Malformed JSON string payload submitted",
      expected: "success=false, errorCode=MALFORMED_QR",
      actual: `success=${res5.success}, errorCode=${res5.errorCode}`,
      passed: res5.success === false && res5.errorCode === "MALFORMED_QR",
    });

    // -------------------------------------------------------------
    // Test 6: Repeated expired QR submissions -> Safe rejection
    // -------------------------------------------------------------
    const expiredChal = await createTestChallenge(session.id, -5000); // Expired 5s ago
    const res6 = await processAttendanceSubmission(
      { userId: member5.clerkId, role: "MEMBER", email: member5.email, name: member5.name! },
      expiredChal.payload,
      insideLocation
    );

    results.push({
      testId: 6,
      testName: "Expired QR Abuse",
      scenario: "Submission with expired challenge token",
      expected: "success=false, errorCode=CHALLENGE_EXPIRED",
      actual: `success=${res6.success}, errorCode=${res6.errorCode}`,
      passed: res6.success === false && res6.errorCode === "CHALLENGE_EXPIRED",
    });

    // -------------------------------------------------------------
    // Test 7: Repeated outside-geofence attempts -> Safe rejection
    // -------------------------------------------------------------
    const chal7 = await createTestChallenge(session.id);
    const res7 = await processAttendanceSubmission(
      { userId: member5.clerkId, role: "MEMBER", email: member5.email, name: member5.name! },
      chal7.payload,
      outsideLocation
    );

    results.push({
      testId: 7,
      testName: "Outside Geofence Abuse",
      scenario: "Member attempts attendance from 100m outside geofence",
      expected: "success=false, errorCode=LOCATION_OUTSIDE",
      actual: `success=${res7.success}, errorCode=${res7.errorCode}`,
      passed: res7.success === false && res7.errorCode === "LOCATION_OUTSIDE",
    });

    // -------------------------------------------------------------
    // Test 8: Multiple legitimate members using same QR -> Both succeed
    // -------------------------------------------------------------
    const chal8 = await createTestChallenge(session.id);
    const member6 = await prisma.user.create({
      data: {
        clerkId: `clerk_m6_${testRunId}`,
        email: `m6_${testRunId}@scetngp.edu`,
        name: `Member 6 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    const resM2 = await processAttendanceSubmission(
      { userId: member2.clerkId, role: "MEMBER", email: member2.email, name: member2.name! },
      chal8.payload,
      insideLocation
    );

    const resM6 = await processAttendanceSubmission(
      { userId: member6.clerkId, role: "MEMBER", email: member6.email, name: member6.name! },
      chal8.payload,
      insideLocation
    );

    results.push({
      testId: 8,
      testName: "Multiple Members Using Same QR",
      scenario: "Same displayed QR used by two legitimate members during valid window",
      expected: "Both succeed independently",
      actual: `M2_success=${resM2.success}, M6_success=${resM6.success}`,
      passed: resM2.success === true && resM6.success === true,
    });

    // -------------------------------------------------------------
    // Test 9: One member using multiple browser contexts -> No duplicate
    // -------------------------------------------------------------
    const chal9 = await createTestChallenge(session.id);
    const res9TabA = await processAttendanceSubmission(
      { userId: member2.clerkId, role: "MEMBER", email: member2.email, name: member2.name! },
      chal9.payload,
      insideLocation,
      { contextId: "ctx_tab_alpha_12345678" }
    );
    const res9TabB = await processAttendanceSubmission(
      { userId: member2.clerkId, role: "MEMBER", email: member2.email, name: member2.name! },
      chal9.payload,
      insideLocation,
      { contextId: "ctx_tab_bravo_98765432" }
    );

    const countM2 = await prisma.attendanceRecord.count({
      where: { sessionId: session.id, userId: member2.id },
    });

    results.push({
      testId: 9,
      testName: "Multiple Browser Contexts",
      scenario: "Same user submits from simulated Tab A and Tab B",
      expected: "DB count=1, safe duplicate handling",
      actual: `DB count=${countM2}, TabA_dup=${res9TabA.alreadyMarked}, TabB_dup=${res9TabB.alreadyMarked}`,
      passed: countM2 === 1 && res9TabA.alreadyMarked === true && res9TabB.alreadyMarked === true,
    });

    // -------------------------------------------------------------
    // Test 10: Fake security flags (trustedDevice=true) -> Ignored
    // -------------------------------------------------------------
    const chal10 = await createTestChallenge(session.id);
    const member7 = await prisma.user.create({
      data: {
        clerkId: `clerk_m7_${testRunId}`,
        email: `m7_${testRunId}@scetngp.edu`,
        name: `Member 7 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    // Submit outside location with fake trustedDevice=true
    const res10 = await processAttendanceSubmission(
      { userId: member7.clerkId, role: "MEMBER", email: member7.email, name: member7.name! },
      chal10.payload,
      { ...outsideLocation, trustedDevice: true, isTrusted: true },
      { trustedDevice: true, bypassGeofence: true }
    );

    results.push({
      testId: 10,
      testName: "Fake Security Flags Ignored",
      scenario: "Client submits trustedDevice=true while outside geofence",
      expected: "Rejected by server geofence (trustedDevice ignored)",
      actual: `success=${res10.success}, errorCode=${res10.errorCode}`,
      passed: res10.success === false && res10.errorCode === "LOCATION_OUTSIDE",
    });

    // -------------------------------------------------------------
    // Test 11: Fake risk score (riskScore=0) -> Ignored
    // -------------------------------------------------------------
    const chal11 = await createTestChallenge(session.id);
    const res11 = await processAttendanceSubmission(
      { userId: member7.clerkId, role: "MEMBER", email: member7.email, name: member7.name! },
      chal11.payload,
      { ...outsideLocation, riskScore: 0, verificationPassed: true },
      { riskScore: 0 }
    );

    results.push({
      testId: 11,
      testName: "Fake Risk Score Ignored",
      scenario: "Client submits riskScore=0 with outside coordinates",
      expected: "Rejected by server geofence (riskScore ignored)",
      actual: `success=${res11.success}, errorCode=${res11.errorCode}`,
      passed: res11.success === false && res11.errorCode === "LOCATION_OUTSIDE",
    });

    // -------------------------------------------------------------
    // Test 12: Fake browser/session identifier -> Cannot authorize attendance
    // -------------------------------------------------------------
    const res12 = await processAttendanceSubmission(
      null, // Unauthenticated
      chal11.payload,
      insideLocation,
      { contextId: "fake_authorized_ctx_12345" }
    );

    results.push({
      testId: 12,
      testName: "Fake Context ID Cannot Authorize",
      scenario: "Unauthenticated request with simulated context ID",
      expected: "success=false, errorCode=UNAUTHENTICATED",
      actual: `success=${res12.success}, errorCode=${res12.errorCode}`,
      passed: res12.success === false && res12.errorCode === "UNAUTHENTICATED",
    });

    // -------------------------------------------------------------
    // Test 13: Missing browser identifier -> Works normally
    // -------------------------------------------------------------
    const chal13 = await createTestChallenge(session.id);
    const res13 = await processAttendanceSubmission(
      { userId: member7.clerkId, role: "MEMBER", email: member7.email, name: member7.name! },
      chal13.payload,
      insideLocation,
      undefined // No client context provided
    );

    results.push({
      testId: 13,
      testName: "Missing Browser Identifier",
      scenario: "Valid member without optional client context ID",
      expected: "success=true, status=PRESENT",
      actual: `success=${res13.success}, status=${res13.record?.status}`,
      passed: res13.success === true && res13.record?.status === "PRESENT",
    });

    // -------------------------------------------------------------
    // Test 14: Cross-user browser identifier -> Cannot grant unauthorized access
    // -------------------------------------------------------------
    const res14 = await processAttendanceSubmission(
      { userId: pendingMember.clerkId, role: "PENDING", email: pendingMember.email, name: pendingMember.name! },
      chal13.payload,
      insideLocation,
      { contextId: "ctx_admin_stolen_id_123456" }
    );

    results.push({
      testId: 14,
      testName: "Cross-User Context Identifier",
      scenario: "PENDING user with high-privilege context ID string",
      expected: "success=false, errorCode=UNAUTHORIZED_ROLE",
      actual: `success=${res14.success}, errorCode=${res14.errorCode}`,
      passed: res14.success === false && res14.errorCode === "UNAUTHORIZED_ROLE",
    });

    // -------------------------------------------------------------
    // Test 15: Expired QR token replay -> Rejected
    // -------------------------------------------------------------
    const member8 = await prisma.user.create({
      data: {
        clerkId: `clerk_m8_${testRunId}`,
        email: `m8_${testRunId}@scetngp.edu`,
        name: `Member 8 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    const expiredChal15 = await createTestChallenge(session.id, -10_000); // 10s expired
    const res15 = await processAttendanceSubmission(
      { userId: member8.clerkId, role: "MEMBER", email: member8.email, name: member8.name! },
      expiredChal15.payload,
      insideLocation
    );

    results.push({
      testId: 15,
      testName: "Expired QR Token Replay",
      scenario: "Replay attempt of expired QR token",
      expected: "success=false, errorCode=CHALLENGE_EXPIRED",
      actual: `success=${res15.success}, errorCode=${res15.errorCode}`,
      passed: res15.success === false && res15.errorCode === "CHALLENGE_EXPIRED",
    });

    // -------------------------------------------------------------
    // Test 16: Cross-session QR -> Rejected
    // -------------------------------------------------------------
    const otherSession = await prisma.attendanceSession.create({
      data: {
        roomId: room.id,
        hostUserId: hostUser.id,
        title: `Other Session ${testRunId}`,
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });

    const otherChal = await createTestChallenge(otherSession.id);
    // Submit Session B's QR under Session A reference
    const tamperedPayload = JSON.stringify({
      v: QR_PROTOCOL_PREFIX,
      sid: session.id, // Tampered to Session A
      token: otherChal.rawToken,
    });

    const res16 = await processAttendanceSubmission(
      { userId: member8.clerkId, role: "MEMBER", email: member8.email, name: member8.name! },
      tamperedPayload,
      insideLocation
    );

    results.push({
      testId: 16,
      testName: "Cross-Session QR Tampering",
      scenario: "QR token from Session B submitted for Session A",
      expected: "success=false, errorCode=SESSION_MISMATCH",
      actual: `success=${res16.success}, errorCode=${res16.errorCode}`,
      passed: res16.success === false && (res16.errorCode === "SESSION_MISMATCH" || res16.errorCode === "INVALID_CHALLENGE"),
    });

    // -------------------------------------------------------------
    // Test 17: Session ends during submission -> Rejected
    // -------------------------------------------------------------
    const dyingSession = await prisma.attendanceSession.create({
      data: {
        roomId: room.id,
        hostUserId: hostUser.id,
        title: `Dying Session ${testRunId}`,
        status: SessionStatus.ENDED,
        startsAt: new Date(),
        endsAt: new Date(),
      },
    });

    const dyingChal = await createTestChallenge(dyingSession.id);
    const res17 = await processAttendanceSubmission(
      { userId: member8.clerkId, role: "MEMBER", email: member8.email, name: member8.name! },
      dyingChal.payload,
      insideLocation
    );

    results.push({
      testId: 17,
      testName: "Session End Race Guard",
      scenario: "Session ended before submission completes",
      expected: "success=false, errorCode=SESSION_INACTIVE",
      actual: `success=${res17.success}, errorCode=${res17.errorCode}`,
      passed: res17.success === false && res17.errorCode === "SESSION_INACTIVE",
    });

    // -------------------------------------------------------------
    // Test 18: Room becomes inactive -> Rejected
    // -------------------------------------------------------------
    const inactiveRoom = await prisma.room.create({
      data: {
        name: `Inactive Room ${testRunId}`,
        code: `RM-INACT-${Date.now().toString().slice(-6)}`,
        latitude: 21.1145,
        longitude: 79.056,
        radiusMeters: 30,
        isActive: false,
      },
    });

    const inactRoomSession = await prisma.attendanceSession.create({
      data: {
        roomId: inactiveRoom.id,
        hostUserId: hostUser.id,
        title: `Inactive Room Session ${testRunId}`,
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });

    const inactChal = await createTestChallenge(inactRoomSession.id);
    const res18 = await processAttendanceSubmission(
      { userId: member8.clerkId, role: "MEMBER", email: member8.email, name: member8.name! },
      inactChal.payload,
      insideLocation
    );

    results.push({
      testId: 18,
      testName: "Inactive Room Guard",
      scenario: "Room marked inactive before attendance creation",
      expected: "success=false, errorCode=ROOM_INACTIVE",
      actual: `success=${res18.success}, errorCode=${res18.errorCode}`,
      passed: res18.success === false && res18.errorCode === "ROOM_INACTIVE",
    });

    // -------------------------------------------------------------
    // Test 19: Role revoked during submission -> Rejected
    // -------------------------------------------------------------
    const revokedMember = await prisma.user.create({
      data: {
        clerkId: `clerk_revoked_${testRunId}`,
        email: `revoked_${testRunId}@scetngp.edu`,
        name: `Revoked ${testRunId}`,
        role: PrismaAppRole.PENDING, // Revoked in DB
      },
    });

    const chal19 = await createTestChallenge(session.id);
    const res19 = await processAttendanceSubmission(
      { userId: revokedMember.clerkId, role: "MEMBER", email: revokedMember.email, name: revokedMember.name! }, // Claims MEMBER from stale client token
      chal19.payload,
      insideLocation
    );

    results.push({
      testId: 19,
      testName: "Role Revocation Race Guard",
      scenario: "Client claims MEMBER but MySQL DB role is PENDING",
      expected: "success=false, errorCode=UNAUTHORIZED_ROLE",
      actual: `success=${res19.success}, errorCode=${res19.errorCode}`,
      passed: res19.success === false && res19.errorCode === "UNAUTHORIZED_ROLE",
    });

    // -------------------------------------------------------------
    // Test 20: Direct API bypass -> Server validation enforced
    // -------------------------------------------------------------
    const res20 = await processAttendanceSubmission(
      { userId: member8.clerkId, role: "MEMBER", email: member8.email, name: member8.name! },
      null, // Direct API invocation with empty payload
      insideLocation
    );

    results.push({
      testId: 20,
      testName: "Direct API Bypass Protection",
      scenario: "Direct API submission bypassing UI with null payload",
      expected: "success=false, errorCode=INVALID_QR",
      actual: `success=${res20.success}, errorCode=${res20.errorCode}`,
      passed: res20.success === false && res20.errorCode === "INVALID_QR",
    });

    // -------------------------------------------------------------
    // Test 21: Security Invariants Verification
    // -------------------------------------------------------------
    // Invariant 1: count(AttendanceRecord) <= 1 per user/session
    const records = await prisma.attendanceRecord.groupBy({
      by: ["sessionId", "userId"],
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });

    // Invariant 9/10: AuditLog contains zero raw tokens and zero coordinates
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
      select: { metadata: true },
    });

    let leaksFound = false;
    for (const log of auditLogs) {
      if (!log.metadata) continue;
      const str = log.metadata.toLowerCase();
      if (str.includes("latitude") || str.includes("longitude") || str.includes("rawtoken")) {
        leaksFound = true;
        break;
      }
    }

    results.push({
      testId: 21,
      testName: "Security Invariants Check",
      scenario: "DB Uniqueness invariant and Privacy Audit Log invariant",
      expected: "0 duplicates violations, 0 metadata privacy leaks",
      actual: `duplicateViolations=${records.length}, privacyLeaks=${leaksFound}`,
      passed: records.length === 0 && leaksFound === false,
    });
  } catch (err) {
    results.push({
      testId: 999,
      testName: "Unexpected Execution Error",
      scenario: "Fatal exception during test suite",
      expected: "No exceptions",
      actual: String(err),
      passed: false,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return NextResponse.json({
    summary: {
      total: totalCount,
      passed: passedCount,
      failed: totalCount - passedCount,
      allPassed: passedCount === totalCount,
      timestamp: new Date().toISOString(),
    },
    results,
  });
}
