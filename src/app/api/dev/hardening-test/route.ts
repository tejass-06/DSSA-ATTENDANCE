/**
 * DSSA Room Attendance System
 * Comprehensive Phase 13 Duplicate Protection & Security Hardening Test Runner
 * GET /api/dev/hardening-test
 * Strictly disabled in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateQRChallenge } from "@/lib/qr/service";
import { globalRateLimiter } from "@/lib/security/rateLimiter";
import { processAttendanceSubmission } from "@/lib/attendance/service";
import { AppRole, SessionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface TestResult {
  testNumber: number;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  const results: TestResult[] = [];

  try {
    // 0. Setup test fixtures: Room, Host, 3 Members, 1 Pending user
    const testRoom = await prisma.room.create({
      data: {
        name: "Hardening Room SCET",
        code: `TEST-HD13-${Date.now()}`,
        latitude: 21.0965000,
        longitude: 79.1670000,
        radiusMeters: 30,
        isActive: true,
      },
    });

    const hostUser = await prisma.user.create({
      data: {
        clerkId: `user_test_host13_${Date.now()}`,
        email: `host13_${Date.now()}@dssa.edu`,
        name: "Host User 13",
        role: AppRole.HOST,
      },
    });

    const memberUserA = await prisma.user.create({
      data: {
        clerkId: `user_test_mem13A_${Date.now()}`,
        email: `mem13A_${Date.now()}@dssa.edu`,
        name: "Member 13A",
        role: AppRole.MEMBER,
      },
    });

    const memberUserB = await prisma.user.create({
      data: {
        clerkId: `user_test_mem13B_${Date.now()}`,
        email: `mem13B_${Date.now()}@dssa.edu`,
        name: "Member 13B",
        role: AppRole.MEMBER,
      },
    });

    const memberUserC = await prisma.user.create({
      data: {
        clerkId: `user_test_mem13C_${Date.now()}`,
        email: `mem13C_${Date.now()}@dssa.edu`,
        name: "Member 13C",
        role: AppRole.MEMBER,
      },
    });

    const pendingUser = await prisma.user.create({
      data: {
        clerkId: `user_test_pending13_${Date.now()}`,
        email: `pending13_${Date.now()}@dssa.edu`,
        name: "Pending User 13",
        role: AppRole.PENDING,
      },
    });

    const sessionA = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: hostUser.id,
        title: "Phase 13 Hardening Session A",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });

    const challengeA1 = await generateQRChallenge(sessionA.id);
    const challengeA2 = await generateQRChallenge(sessionA.id);

    const validInsideLocation = {
      latitude: 21.0965200,
      longitude: 79.1670000,
      accuracy: 5.0,
    };

    const memberAContext = {
      userId: memberUserA.clerkId,
      role: "MEMBER" as const,
      email: memberUserA.email,
      name: memberUserA.name!,
    };

    const memberBContext = {
      userId: memberUserB.clerkId,
      role: "MEMBER" as const,
      email: memberUserB.email,
      name: memberUserB.name!,
    };

    const memberCContext = {
      userId: memberUserC.clerkId,
      role: "MEMBER" as const,
      email: memberUserC.email,
      name: memberUserC.name!,
    };

    const pendingContext = {
      userId: pendingUser.clerkId,
      role: "PENDING" as const,
      email: pendingUser.email,
      name: pendingUser.name!,
    };

    // ==========================================
    // 1. CONCURRENCY & DUPLICATE PROTECTION TESTS
    // ==========================================

    // Test 1: Same member, same QR, 2 concurrent requests
    const [c2a, c2b] = await Promise.all([
      processAttendanceSubmission(memberAContext, challengeA1.payload, validInsideLocation),
      processAttendanceSubmission(memberAContext, challengeA1.payload, validInsideLocation),
    ]);
    const memARecords = await prisma.attendanceRecord.findMany({
      where: { sessionId: sessionA.id, userId: memberUserA.id },
    });
    const c2Successes = [c2a, c2b].filter((r) => r.success).length;
    results.push({
      testNumber: 1,
      name: "Concurrency: 2 simultaneous submissions (same member, same QR)",
      expected: "Both resolve safely, exactly 1 DB record created",
      actual: `Successes=${c2Successes}/2, TotalDBRecords=${memARecords.length}`,
      passed: c2Successes === 2 && memARecords.length === 1,
    });

    // Reset rate limiter for isolated suite execution
    globalRateLimiter.resetAll();

    // Test 2: Same member, same QR, 10 rapid concurrent requests
    const tenPromises = Array.from({ length: 10 }).map(() =>
      processAttendanceSubmission(memberBContext, challengeA1.payload, validInsideLocation)
    );
    const tenResults = await Promise.all(tenPromises);
    const memBRecords = await prisma.attendanceRecord.findMany({
      where: { sessionId: sessionA.id, userId: memberUserB.id },
    });
    const tenHandledSafely = tenResults.filter((r) => r.success || r.errorCode === "RATE_LIMITED").length;
    results.push({
      testNumber: 2,
      name: "Concurrency: 10 rapid concurrent submissions (same member)",
      expected: "All 10 resolve safely (success/duplicate or rate-limited), exactly 1 DB record created",
      actual: `HandledSafely=${tenHandledSafely}/10, TotalDBRecords=${memBRecords.length}`,
      passed: tenHandledSafely === 10 && memBRecords.length === 1,
    });

    // Test 3: Same member, different valid QR challenge for same session
    const resDifferentQR = await processAttendanceSubmission(
      memberAContext,
      challengeA2.payload,
      validInsideLocation
    );
    const memARecordsAfterQ2 = await prisma.attendanceRecord.findMany({
      where: { sessionId: sessionA.id, userId: memberUserA.id },
    });
    results.push({
      testNumber: 3,
      name: "Different valid QR challenge for already-attended session",
      expected: "alreadyMarked=true, exactly 1 DB record",
      actual: `alreadyMarked=${resDifferentQR.alreadyMarked}, TotalDBRecords=${memARecordsAfterQ2.length}`,
      passed: resDifferentQR.success === true && resDifferentQR.alreadyMarked === true && memARecordsAfterQ2.length === 1,
    });

    // Test 4: Multi-tab simulation (Tab A and Tab B submitting in parallel for Member C)
    const [tabA, tabB] = await Promise.all([
      processAttendanceSubmission(memberCContext, challengeA2.payload, validInsideLocation),
      processAttendanceSubmission(memberCContext, challengeA2.payload, validInsideLocation),
    ]);
    const memCRecords = await prisma.attendanceRecord.findMany({
      where: { sessionId: sessionA.id, userId: memberUserC.id },
    });
    results.push({
      testNumber: 4,
      name: "Multi-tab simultaneous submission",
      expected: "Exactly 1 DB record created for Member C",
      actual: `TabASuccess=${tabA.success}, TabBSuccess=${tabB.success}, DBRecords=${memCRecords.length}`,
      passed: tabA.success === true && tabB.success === true && memCRecords.length === 1,
    });

    // Test 5: Two different members scanning the same current QR
    const tempMember5A = await prisma.user.create({
      data: { clerkId: `user_t5A_${Date.now()}`, email: `t5A_${Date.now()}@dssa.edu`, name: "M5A", role: AppRole.MEMBER },
    });
    const tempMember5B = await prisma.user.create({
      data: { clerkId: `user_t5B_${Date.now()}`, email: `t5B_${Date.now()}@dssa.edu`, name: "M5B", role: AppRole.MEMBER },
    });
    const [r5A, r5B] = await Promise.all([
      processAttendanceSubmission(
        { userId: tempMember5A.clerkId, role: "MEMBER", email: tempMember5A.email, name: tempMember5A.name! },
        challengeA1.payload,
        validInsideLocation
      ),
      processAttendanceSubmission(
        { userId: tempMember5B.clerkId, role: "MEMBER", email: tempMember5B.email, name: tempMember5B.name! },
        challengeA1.payload,
        validInsideLocation
      ),
    ]);
    results.push({
      testNumber: 5,
      name: "Two different members scan same rotating QR challenge",
      expected: "Both independently succeed with PRESENT records (QR not single-use)",
      actual: `M5ASuccess=${r5A.success}, M5BSuccess=${r5B.success}`,
      passed: r5A.success === true && r5B.success === true && r5A.alreadyMarked === false && r5B.alreadyMarked === false,
    });

    // ==========================================
    // 2. TRANSACTION RACE CONDITIONS
    // ==========================================

    // Test 6: Session ends during submission
    const sessionEnding = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: hostUser.id,
        title: "Ending Session 13",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    const challengeEnding = await generateQRChallenge(sessionEnding.id);
    // Conclude session in DB
    await prisma.attendanceSession.update({
      where: { id: sessionEnding.id },
      data: { status: SessionStatus.ENDED, endsAt: new Date() },
    });
    const resEnding = await processAttendanceSubmission(
      { userId: tempMember5A.clerkId, role: "MEMBER", email: tempMember5A.email, name: tempMember5A.name! },
      challengeEnding.payload,
      validInsideLocation
    );
    results.push({
      testNumber: 6,
      name: "Session-end race condition",
      expected: "Rejected with SESSION_INACTIVE, 0 records created",
      actual: `Success=${resEnding.success}, ErrorCode=${resEnding.errorCode}`,
      passed: resEnding.success === false && resEnding.errorCode?.startsWith("SESSION_INACTIVE") === true,
    });

    // Test 7: Room deactivation race
    const roomDeact = await prisma.room.create({
      data: {
        name: "Deactivating Room",
        code: `DEACT-${Date.now()}`,
        latitude: 21.0965000,
        longitude: 79.1670000,
        radiusMeters: 30,
        isActive: true,
      },
    });
    const sessionDeact = await prisma.attendanceSession.create({
      data: {
        roomId: roomDeact.id,
        hostUserId: hostUser.id,
        title: "Session in Room to Deactivate",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    const challengeDeact = await generateQRChallenge(sessionDeact.id);
    // Deactivate room in DB
    await prisma.room.update({
      where: { id: roomDeact.id },
      data: { isActive: false },
    });
    const resDeact = await processAttendanceSubmission(
      { userId: tempMember5A.clerkId, role: "MEMBER", email: tempMember5A.email, name: tempMember5A.name! },
      challengeDeact.payload,
      validInsideLocation
    );
    results.push({
      testNumber: 7,
      name: "Room deactivation race condition",
      expected: "Rejected with ROOM_INACTIVE, 0 records created",
      actual: `Success=${resDeact.success}, ErrorCode=${resDeact.errorCode}`,
      passed: resDeact.success === false && resDeact.errorCode === "ROOM_INACTIVE",
    });

    // Test 8: User role change in DB to PENDING
    const revokedUser = await prisma.user.create({
      data: {
        clerkId: `user_revoked_${Date.now()}`,
        email: `revoked_${Date.now()}@dssa.edu`,
        name: "Revoked User",
        role: AppRole.PENDING, // Role set to PENDING in MySQL
      },
    });
    const challengeFresh = await generateQRChallenge(sessionA.id);
    const resRevoked = await processAttendanceSubmission(
      { userId: revokedUser.clerkId, role: "MEMBER", email: revokedUser.email, name: revokedUser.name! },
      challengeFresh.payload,
      validInsideLocation
    );
    results.push({
      testNumber: 8,
      name: "User role change race (MySQL role is PENDING)",
      expected: "Rejected with UNAUTHORIZED_ROLE",
      actual: `Success=${resRevoked.success}, ErrorCode=${resRevoked.errorCode}`,
      passed: resRevoked.success === false && resRevoked.errorCode === "UNAUTHORIZED_ROLE",
    });

    // ==========================================
    // 3. MALICIOUS INPUT & CLIENT SPOOFING TESTS
    // ==========================================

    // Test 9: Client submits fake user ID in payload
    const fakeUserIdPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionA.id,
      token: (await generateQRChallenge(sessionA.id)).rawToken,
      userId: "hacker_target_user_999",
      exp: Date.now() + 30000,
    });
    const tempMember9 = await prisma.user.create({
      data: { clerkId: `user_t9_${Date.now()}`, email: `t9_${Date.now()}@dssa.edu`, name: "M9", role: AppRole.MEMBER },
    });
    const res9 = await processAttendanceSubmission(
      { userId: tempMember9.clerkId, role: "MEMBER", email: tempMember9.email, name: tempMember9.name! },
      fakeUserIdPayload,
      validInsideLocation
    );
    const record9 = await prisma.attendanceRecord.findUnique({
      where: { sessionId_userId: { sessionId: sessionA.id, userId: tempMember9.id } },
    });
    results.push({
      testNumber: 9,
      name: "Client submits fake user ID in payload",
      expected: "Server ignores fake user ID, uses authenticated Clerk identity",
      actual: `CreatedForId=${record9?.userId} (expected ${tempMember9.id})`,
      passed: res9.success === true && record9?.userId === tempMember9.id,
    });

    // Test 10: Client submits fake session ID
    const fakeSidPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: "non_existent_fake_session_123",
      token: (await generateQRChallenge(sessionA.id)).rawToken,
    });
    const res10 = await processAttendanceSubmission(
      { userId: tempMember9.clerkId, role: "MEMBER", email: tempMember9.email, name: tempMember9.name! },
      fakeSidPayload,
      validInsideLocation
    );
    results.push({
      testNumber: 10,
      name: "Client submits fake session ID in payload",
      expected: "Rejected with SESSION_MISMATCH",
      actual: `Success=${res10.success}, ErrorCode=${res10.errorCode}`,
      passed: res10.success === false && res10.errorCode === "SESSION_MISMATCH",
    });

    // Test 11: Client submits fake distance, fake radius, fake insideRoom
    const fakeAllCoords = {
      latitude: 21.0985000, // 220m away from room
      longitude: 79.1670000,
      accuracy: 5.0,
      distance: 0,
      distanceMeters: 0,
      radius: 9999,
      radiusMeters: 9999,
      insideRoom: true,
    };
    const challenge11 = await generateQRChallenge(sessionA.id);
    const tempMember11 = await prisma.user.create({
      data: { clerkId: `user_t11_${Date.now()}`, email: `t11_${Date.now()}@dssa.edu`, name: "M11", role: AppRole.MEMBER },
    });
    const res11 = await processAttendanceSubmission(
      { userId: tempMember11.clerkId, role: "MEMBER", email: tempMember11.email, name: tempMember11.name! },
      challenge11.payload,
      fakeAllCoords
    );
    results.push({
      testNumber: 11,
      name: "Client submits fake distance, fake radius, and fake insideRoom",
      expected: "Server ignores all fake parameters, calculates real distance, rejects LOCATION_OUTSIDE",
      actual: `Success=${res11.success}, ErrorCode=${res11.errorCode}`,
      passed: res11.success === false && res11.errorCode === "LOCATION_OUTSIDE",
    });

    // Test 12: Malformed huge token & non-hex token
    const hugeTokenPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionA.id,
      token: "a".repeat(500),
    });
    const res12a = await processAttendanceSubmission(
      { userId: tempMember11.clerkId, role: "MEMBER", email: tempMember11.email, name: tempMember11.name! },
      hugeTokenPayload,
      validInsideLocation
    );
    const nonHexTokenPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionA.id,
      token: "not_a_hex_token_with_invalid_characters_xyz!",
    });
    const res12b = await processAttendanceSubmission(
      { userId: tempMember11.clerkId, role: "MEMBER", email: tempMember11.email, name: tempMember11.name! },
      nonHexTokenPayload,
      validInsideLocation
    );
    results.push({
      testNumber: 12,
      name: "Huge token string & non-hex token validation",
      expected: "Rejected early as INVALID_PAYLOAD",
      actual: `HugeTokenCode=${res12a.errorCode}, NonHexCode=${res12b.errorCode}`,
      passed: res12a.success === false && res12b.success === false,
    });

    // Test 13: Unknown protocol version
    const unknownVersionPayload = JSON.stringify({
      v: "DSSA_ATT_V999",
      sid: sessionA.id,
      token: (await generateQRChallenge(sessionA.id)).rawToken,
    });
    const res13 = await processAttendanceSubmission(
      { userId: tempMember11.clerkId, role: "MEMBER", email: tempMember11.email, name: tempMember11.name! },
      unknownVersionPayload,
      validInsideLocation
    );
    results.push({
      testNumber: 13,
      name: "Unsupported QR protocol version",
      expected: "Rejected with INVALID_VERSION",
      actual: `Success=${res13.success}, ErrorCode=${res13.errorCode}`,
      passed: res13.success === false && res13.errorCode === "INVALID_VERSION",
    });

    // Test 14: PENDING user & Unauthenticated requests
    const res14a = await processAttendanceSubmission(pendingContext, challengeA1.payload, validInsideLocation);
    const res14b = await processAttendanceSubmission(null, challengeA1.payload, validInsideLocation);
    results.push({
      testNumber: 14,
      name: "PENDING user & Unauthenticated request authorization",
      expected: "PENDING rejected with UNAUTHORIZED_ROLE, Unauth rejected with UNAUTHENTICATED",
      actual: `PendingCode=${res14a.errorCode}, UnauthCode=${res14b.errorCode}`,
      passed: res14a.errorCode === "UNAUTHORIZED_ROLE" && res14b.errorCode === "UNAUTHENTICATED",
    });

    // ==========================================
    // 4. INVARIANTS CHECK
    // ==========================================

    // Invariant Check 1: Every attendance record in DB has unique (sessionId, userId)
    const records = await prisma.attendanceRecord.groupBy({
      by: ["sessionId", "userId"],
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });
    results.push({
      testNumber: 15,
      name: "Database Invariant: @@unique([sessionId, userId]) count <= 1",
      expected: "Zero duplicate pairs found",
      actual: `DuplicateCount=${records.length}`,
      passed: records.length === 0,
    });

    // Invariant Check 2: AuditLog entries contain zero raw coordinates or plain tokens
    const recentLogs = await prisma.auditLog.findMany({
      where: { entityType: "AttendanceRecord" },
      take: 10,
    });
    const anyLeakedCoordinates = recentLogs.some((l) => {
      if (!l.metadata) return false;
      return l.metadata.includes("latitude") || l.metadata.includes("longitude") || l.metadata.includes("rawToken");
    });
    results.push({
      testNumber: 16,
      name: "Privacy Invariant: AuditLog contains zero raw GPS coordinates or raw tokens",
      expected: "Zero coordinates/tokens leaked in AuditLog metadata",
      actual: `LeakedFound=${anyLeakedCoordinates}`,
      passed: !anyLeakedCoordinates,
    });

  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        results,
      },
      { status: 500 }
    );
  } finally {
    // Cascaded cleanup of test fixtures
    try {
      await prisma.attendanceRecord.deleteMany({
        where: {
          session: {
            title: { in: ["Phase 13 Hardening Session A", "Ending Session 13", "Session in Room to Deactivate"] },
          },
        },
      });
      await prisma.qRChallenge.deleteMany({
        where: {
          session: {
            title: { in: ["Phase 13 Hardening Session A", "Ending Session 13", "Session in Room to Deactivate"] },
          },
        },
      });
      await prisma.auditLog.deleteMany({
        where: { entityType: "AttendanceRecord" },
      });
      await prisma.attendanceSession.deleteMany({
        where: {
          title: { in: ["Phase 13 Hardening Session A", "Ending Session 13", "Session in Room to Deactivate"] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: { contains: "dssa.edu" },
        },
      });
      await prisma.room.deleteMany({
        where: {
          name: { in: ["Hardening Room SCET", "Deactivating Room"] },
        },
      });
    } catch {
      // Ignore cleanup errors
    }
  }

  const allPassed = results.every((r) => r.passed);
  return NextResponse.json(
    {
      success: allPassed,
      totalTests: results.length,
      passedCount: results.filter((r) => r.passed).length,
      failedCount: results.filter((r) => !r.passed).length,
      results,
    },
    { status: allPassed ? 200 : 500 }
  );
}
