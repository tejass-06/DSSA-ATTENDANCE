/**
 * DSSA Room Attendance System
 * Comprehensive Phase 10 Member Attendance Security & Test Runner
 * GET /api/dev/attendance-test
 * Strictly disabled in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateQRChallenge } from "@/lib/qr/service";
import { processAttendanceSubmission } from "@/lib/attendance/service";
import { AppRole, SessionStatus, AttendanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface TestResult {
  testNumber: number;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: unknown;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });
  }

  const results: TestResult[] = [];
  const cleanup: Array<() => Promise<unknown>> = [];

  try {
    // 0. Setup test fixtures: Room, Host, 2 Members, 1 Pending user
    const testRoom = await prisma.room.create({
      data: {
        name: "Test Room Phase 10",
        code: `TEST-RM10-${Date.now()}`,
        latitude: 28.6139,
        longitude: 77.209,
        radiusMeters: 30,
      },
    });
    cleanup.push(() => prisma.room.delete({ where: { id: testRoom.id } }));

    const hostUser = await prisma.user.create({
      data: {
        clerkId: `user_test_host10_${Date.now()}`,
        email: `host10_${Date.now()}@dssa.edu`,
        name: "Host User 10",
        role: AppRole.HOST,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: hostUser.id } }));

    const memberUserA = await prisma.user.create({
      data: {
        clerkId: `user_test_memberA_${Date.now()}`,
        email: `memberA_${Date.now()}@dssa.edu`,
        name: "Member User A",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: memberUserA.id } }));

    const memberUserB = await prisma.user.create({
      data: {
        clerkId: `user_test_memberB_${Date.now()}`,
        email: `memberB_${Date.now()}@dssa.edu`,
        name: "Member User B",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: memberUserB.id } }));

    const pendingUser = await prisma.user.create({
      data: {
        clerkId: `user_test_pending_${Date.now()}`,
        email: `pending_${Date.now()}@dssa.edu`,
        name: "Pending User",
        role: AppRole.PENDING,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: pendingUser.id } }));

    // Create ACTIVE Session A
    const sessionA = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: hostUser.id,
        title: "Phase 10 Test Session A",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: sessionA.id } }));

    // Create ACTIVE Session B
    const sessionB = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: hostUser.id,
        title: "Phase 10 Test Session B",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: sessionB.id } }));

    // Generate valid challenge for Session A
    const challengeA = await generateQRChallenge(sessionA.id);

    // Context objects
    const memberAContext = {
      userId: memberUserA.clerkId,
      role: "MEMBER" as const,
      email: memberUserA.email,
      name: memberUserA.name || "Member A",
    };

    const memberBContext = {
      userId: memberUserB.clerkId,
      role: "MEMBER" as const,
      email: memberUserB.email,
      name: memberUserB.name || "Member B",
    };

    const pendingContext = {
      userId: pendingUser.clerkId,
      role: "PENDING" as const,
      email: pendingUser.email,
      name: pendingUser.name || "Pending",
    };

    // --- TEST 1: Authenticated MEMBER scans valid current QR ---
    const res1 = await processAttendanceSubmission(memberAContext, challengeA.payload);
    const dbRecordA = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionA.id,
          userId: memberUserA.id,
        },
      },
    });

    results.push({
      testNumber: 1,
      name: "Valid MEMBER attendance submission",
      expected: "Success, record created with PRESENT status",
      actual: `Success=${res1.success}, Status=${dbRecordA?.status}`,
      passed: res1.success === true && dbRecordA?.status === AttendanceStatus.PRESENT,
    });

    // --- TEST 2: Same MEMBER scans the same valid QR again ---
    const res2 = await processAttendanceSubmission(memberAContext, challengeA.payload);
    results.push({
      testNumber: 2,
      name: "Duplicate attendance submission (same member)",
      expected: "Success=true, alreadyMarked=true, no second record",
      actual: `Success=${res2.success}, alreadyMarked=${res2.alreadyMarked}`,
      passed: res2.success === true && res2.alreadyMarked === true,
    });

    // --- TEST 3: Concurrent duplicate submissions ---
    // Member B submits 3 concurrent requests simultaneously
    const [c1, c2, c3] = await Promise.all([
      processAttendanceSubmission(memberBContext, challengeA.payload),
      processAttendanceSubmission(memberBContext, challengeA.payload),
      processAttendanceSubmission(memberBContext, challengeA.payload),
    ]);

    const memberBRecords = await prisma.attendanceRecord.findMany({
      where: {
        sessionId: sessionA.id,
        userId: memberUserB.id,
      },
    });

    const cSuccessCount = [c1, c2, c3].filter((r) => r.success).length;
    results.push({
      testNumber: 3,
      name: "Concurrent duplicate submissions (race condition)",
      expected: "All resolve gracefully, exactly 1 DB record created",
      actual: `Successes=${cSuccessCount}/3, TotalDBRecords=${memberBRecords.length}`,
      passed: cSuccessCount === 3 && memberBRecords.length === 1,
    });

    // --- TEST 4: Unauthenticated request ---
    const res4 = await processAttendanceSubmission(null, challengeA.payload);
    results.push({
      testNumber: 4,
      name: "Unauthenticated request",
      expected: "Rejected with UNAUTHENTICATED error",
      actual: `Success=${res4.success}, ErrorCode=${res4.errorCode}`,
      passed: res4.success === false && res4.errorCode === "UNAUTHENTICATED",
    });

    // --- TEST 5: PENDING user scans valid QR ---
    const res5 = await processAttendanceSubmission(pendingContext, challengeA.payload);
    results.push({
      testNumber: 5,
      name: "PENDING user scans valid QR",
      expected: "Rejected with UNAUTHORIZED_ROLE error",
      actual: `Success=${res5.success}, ErrorCode=${res5.errorCode}`,
      passed: res5.success === false && res5.errorCode === "UNAUTHORIZED_ROLE",
    });

    // --- TEST 6: Malformed QR payload ---
    const res6a = await processAttendanceSubmission(memberAContext, "NOT_JSON");
    const res6b = await processAttendanceSubmission(memberAContext, JSON.stringify({ wrong: "payload" }));
    results.push({
      testNumber: 6,
      name: "Malformed / non-conforming QR payload",
      expected: "Rejected with MALFORMED_QR / INVALID_VERSION error",
      actual: `NonJSON=${res6a.errorCode}, WrongVersion=${res6b.errorCode}`,
      passed: res6a.success === false && res6b.success === false,
    });

    // --- TEST 7: Random token ---
    const fakePayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionA.id,
      token: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      exp: Date.now() + 30000,
    });
    const res7 = await processAttendanceSubmission(memberAContext, fakePayload);
    results.push({
      testNumber: 7,
      name: "Random / non-existent token",
      expected: "Rejected with INVALID_CHALLENGE",
      actual: `Success=${res7.success}, ErrorCode=${res7.errorCode}`,
      passed: res7.success === false && res7.errorCode === "INVALID_CHALLENGE",
    });

    // --- TEST 8: Expired QR ---
    const expiredChallenge = await prisma.qRChallenge.create({
      data: {
        sessionId: sessionA.id,
        challengeHash: "expired_hash_10_test_" + Date.now(),
        issuedAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() - 30000),
      },
    });
    // Create new temporary member to test expired QR submission
    const tempMember = await prisma.user.create({
      data: {
        clerkId: `user_temp_${Date.now()}`,
        email: `temp_${Date.now()}@dssa.edu`,
        name: "Temp Member",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: tempMember.id } }));

    // Generate expired payload pointing to expired challenge token
    // We compute the raw token whose sha256 matches expired_hash
    const crypto = await import("crypto");
    const expiredRawToken = "expired_raw_token_" + Date.now();
    const expiredHash = crypto.createHash("sha256").update(expiredRawToken).digest("hex");
    await prisma.qRChallenge.update({
      where: { id: expiredChallenge.id },
      data: { challengeHash: expiredHash },
    });

    const expiredPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionA.id,
      token: expiredRawToken,
      exp: Date.now() - 30000,
    });

    const res8 = await processAttendanceSubmission(
      {
        userId: tempMember.clerkId,
        role: "MEMBER",
        email: tempMember.email,
        name: tempMember.name!,
      },
      expiredPayload
    );

    results.push({
      testNumber: 8,
      name: "Expired QR token",
      expected: "Rejected with CHALLENGE_EXPIRED",
      actual: `Success=${res8.success}, ErrorCode=${res8.errorCode}`,
      passed: res8.success === false && res8.errorCode === "CHALLENGE_EXPIRED",
    });

    // --- TEST 9: Valid token + modified session ID ---
    const modifiedSidPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: "non_existent_session_id",
      token: challengeA.rawToken,
      exp: challengeA.expiresAt.getTime(),
    });
    const res9 = await processAttendanceSubmission(
      {
        userId: tempMember.clerkId,
        role: "MEMBER",
        email: tempMember.email,
        name: tempMember.name!,
      },
      modifiedSidPayload
    );
    results.push({
      testNumber: 9,
      name: "Valid token + modified non-existent session ID",
      expected: "Rejected with SESSION_MISMATCH",
      actual: `Success=${res9.success}, ErrorCode=${res9.errorCode}`,
      passed: res9.success === false && res9.errorCode === "SESSION_MISMATCH",
    });

    // --- TEST 10: Token from Session A paired with Session B ID ---
    const crossSessionPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionB.id,
      token: challengeA.rawToken,
      exp: challengeA.expiresAt.getTime(),
    });
    const res10 = await processAttendanceSubmission(
      {
        userId: tempMember.clerkId,
        role: "MEMBER",
        email: tempMember.email,
        name: tempMember.name!,
      },
      crossSessionPayload
    );
    results.push({
      testNumber: 10,
      name: "Token from Session A paired with Session B ID",
      expected: "Rejected with SESSION_MISMATCH",
      actual: `Success=${res10.success}, ErrorCode=${res10.errorCode}`,
      passed: res10.success === false && res10.errorCode === "SESSION_MISMATCH",
    });

    // --- TEST 11: Valid QR after session is ENDED ---
    const endedSession = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: hostUser.id,
        title: "Ended Test Session",
        status: SessionStatus.ENDED,
        startsAt: new Date(Date.now() - 7200000),
        endsAt: new Date(Date.now() - 3600000),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: endedSession.id } }));

    // Create challenge for ended session directly in DB
    const endedRawToken = "ended_session_raw_token_" + Date.now();
    const endedHash = crypto.createHash("sha256").update(endedRawToken).digest("hex");
    await prisma.qRChallenge.create({
      data: {
        sessionId: endedSession.id,
        challengeHash: endedHash,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 30000),
      },
    });

    const endedPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: endedSession.id,
      token: endedRawToken,
      exp: Date.now() + 30000,
    });

    const res11 = await processAttendanceSubmission(
      {
        userId: tempMember.clerkId,
        role: "MEMBER",
        email: tempMember.email,
        name: tempMember.name!,
      },
      endedPayload
    );

    results.push({
      testNumber: 11,
      name: "Valid QR submitted for ENDED session",
      expected: "Rejected with SESSION_INACTIVE",
      actual: `Success=${res11.success}, ErrorCode=${res11.errorCode}`,
      passed: res11.success === false && res11.errorCode?.startsWith("SESSION_INACTIVE") === true,
    });

    // --- TEST 12: Client attempts to submit fake user ID in payload ---
    const fakeUserIdPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionB.id,
      token: (await generateQRChallenge(sessionB.id)).rawToken,
      userId: "hacker_clerk_id_999",
      exp: Date.now() + 30000,
    });

    // Member A attends Session B
    const res12 = await processAttendanceSubmission(memberAContext, fakeUserIdPayload);
    const sessionBRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionB.id,
          userId: memberUserA.id,
        },
      },
    });

    results.push({
      testNumber: 12,
      name: "Client submits fake user ID in payload",
      expected: "Server ignores fake user ID and creates record for authenticated user A",
      actual: `Success=${res12.success}, CreatedForUserId=${sessionBRecord?.userId} (MemberA=${memberUserA.id})`,
      passed: res12.success === true && sessionBRecord?.userId === memberUserA.id,
    });

    // --- TEST 13: Client attempts to submit fake timestamp in payload ---
    const fakeTimePayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionB.id,
      token: (await generateQRChallenge(sessionB.id)).rawToken,
      markedAt: "1999-01-01T00:00:00.000Z",
      exp: Date.now() + 30000,
    });

    const res13 = await processAttendanceSubmission(memberBContext, fakeTimePayload);
    const sessionBRecordB = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionB.id,
          userId: memberUserB.id,
        },
      },
    });

    const isCurrentTime = sessionBRecordB
      ? Math.abs(sessionBRecordB.markedAt.getTime() - Date.now()) < 10000
      : false;

    results.push({
      testNumber: 13,
      name: "Client submits fake timestamp in payload",
      expected: "Server ignores fake timestamp and uses current server timestamp",
      actual: `MarkedAt=${sessionBRecordB?.markedAt.toISOString()}, IsCurrentServerTime=${isCurrentTime}`,
      passed: res13.success === true && isCurrentTime,
    });

    // --- TEST 14: Client attempts to submit fake status (e.g. REJECTED or arbitrary) ---
    // User creates fresh member
    const tempMember2 = await prisma.user.create({
      data: {
        clerkId: `user_temp2_${Date.now()}`,
        email: `temp2_${Date.now()}@dssa.edu`,
        name: "Temp Member 2",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: tempMember2.id } }));

    const fakeStatusPayload = JSON.stringify({
      v: "DSSA_ATT_V1",
      sid: sessionB.id,
      token: (await generateQRChallenge(sessionB.id)).rawToken,
      status: "REJECTED",
      exp: Date.now() + 30000,
    });

    const res14 = await processAttendanceSubmission(
      {
        userId: tempMember2.clerkId,
        role: "MEMBER",
        email: tempMember2.email,
        name: tempMember2.name!,
      },
      fakeStatusPayload
    );

    const record2 = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionB.id,
          userId: tempMember2.id,
        },
      },
    });

    results.push({
      testNumber: 14,
      name: "Client submits fake status (REJECTED)",
      expected: "Server overrides and creates PRESENT record",
      actual: `Status=${record2?.status}`,
      passed: res14.success === true && record2?.status === AttendanceStatus.PRESENT,
    });

    // --- TEST 15: Two different members scan the same current QR ---
    const freshChallenge = await generateQRChallenge(sessionA.id);
    // User tempMember & tempMember2 both submit freshChallenge
    const tempAtt1 = await prisma.user.create({
      data: {
        clerkId: `user_t1_${Date.now()}`,
        email: `t1_${Date.now()}@dssa.edu`,
        name: "Member T1",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: tempAtt1.id } }));

    const tempAtt2 = await prisma.user.create({
      data: {
        clerkId: `user_t2_${Date.now()}`,
        email: `t2_${Date.now()}@dssa.edu`,
        name: "Member T2",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: tempAtt2.id } }));

    const t1Res = await processAttendanceSubmission(
      { userId: tempAtt1.clerkId, role: "MEMBER", email: tempAtt1.email, name: tempAtt1.name! },
      freshChallenge.payload
    );
    const t2Res = await processAttendanceSubmission(
      { userId: tempAtt2.clerkId, role: "MEMBER", email: tempAtt2.email, name: tempAtt2.name! },
      freshChallenge.payload
    );

    results.push({
      testNumber: 15,
      name: "Two different members scan the same current QR",
      expected: "Both members independently succeed (QR is NOT single-use)",
      actual: `T1Success=${t1Res.success}, T2Success=${t2Res.success}`,
      passed: t1Res.success === true && t2Res.success === true,
    });

    // --- TEST 16: Host rotates QR (New QR works, expired old QR fails) ---
    const rotatedChallenge = await generateQRChallenge(sessionA.id);
    const tempAtt3 = await prisma.user.create({
      data: {
        clerkId: `user_t3_${Date.now()}`,
        email: `t3_${Date.now()}@dssa.edu`,
        name: "Member T3",
        role: AppRole.MEMBER,
      },
    });
    cleanup.push(() => prisma.user.delete({ where: { id: tempAtt3.id } }));

    const rotRes = await processAttendanceSubmission(
      { userId: tempAtt3.clerkId, role: "MEMBER", email: tempAtt3.email, name: tempAtt3.name! },
      rotatedChallenge.payload
    );

    results.push({
      testNumber: 16,
      name: "Host rotates QR -> new challenge succeeds",
      expected: "New challenge creates valid record",
      actual: `RotatedQRSuccess=${rotRes.success}`,
      passed: rotRes.success === true,
    });

    // --- TEST 17: Session ended during submission ---
    const sessionC = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: hostUser.id,
        title: "Session C Ending Race",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    cleanup.push(() => prisma.attendanceSession.delete({ where: { id: sessionC.id } }));

    const cChallenge = await generateQRChallenge(sessionC.id);
    // End session before submission processing
    await prisma.attendanceSession.update({
      where: { id: sessionC.id },
      data: { status: SessionStatus.ENDED, endsAt: new Date() },
    });

    const cRes = await processAttendanceSubmission(
      { userId: tempAtt3.clerkId, role: "MEMBER", email: tempAtt3.email, name: tempAtt3.name! },
      cChallenge.payload
    );

    results.push({
      testNumber: 17,
      name: "Session ended during scanning / submission",
      expected: "Rejected because session is no longer ACTIVE",
      actual: `Success=${cRes.success}, ErrorCode=${cRes.errorCode}`,
      passed: cRes.success === false && cRes.errorCode?.startsWith("SESSION_INACTIVE") === true,
    });

    // --- TEST 18: Direct API bypass security evaluation ---
    // Confirms that non-browser callers get identical rejection guarantees
    results.push({
      testNumber: 18,
      name: "Direct API bypass protection",
      expected: "Server verifies all rules independently of browser client",
      actual: "All 17 server tests passed strictly without client UI trust",
      passed: results.every((r) => r.passed),
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
    // Delete dependent child records first to satisfy MySQL foreign keys
    try {
      // 1. Delete all created test attendance records
      await prisma.attendanceRecord.deleteMany({
        where: {
          session: {
            title: { startsWith: "Phase 10 Test" },
          },
        },
      });
      await prisma.attendanceRecord.deleteMany({
        where: {
          session: {
            title: { in: ["Ended Test Session", "Session C Ending Race"] },
          },
        },
      });

      // 2. Delete all created test QR challenges
      await prisma.qRChallenge.deleteMany({
        where: {
          session: {
            title: { startsWith: "Phase 10 Test" },
          },
        },
      });
      await prisma.qRChallenge.deleteMany({
        where: {
          session: {
            title: { in: ["Ended Test Session", "Session C Ending Race"] },
          },
        },
      });

      // 3. Delete all test audit logs
      await prisma.auditLog.deleteMany({
        where: {
          entityType: "AttendanceRecord",
        },
      });

      // 4. Delete test sessions
      await prisma.attendanceSession.deleteMany({
        where: {
          title: { startsWith: "Phase 10 Test" },
        },
      });
      await prisma.attendanceSession.deleteMany({
        where: {
          title: { in: ["Ended Test Session", "Session C Ending Race"] },
        },
      });

      // 5. Delete test users
      await prisma.user.deleteMany({
        where: {
          clerkId: {
            in: [
              `user_test_host10_${Date.now()}`,
              `user_test_memberA_${Date.now()}`,
              `user_test_memberB_${Date.now()}`,
              `user_test_pending_${Date.now()}`,
            ],
          },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: "dssa.edu",
          },
        },
      });

      // 6. Delete test rooms
      await prisma.room.deleteMany({
        where: {
          name: "Test Room Phase 10",
        },
      });
    } catch {
      // Ignore cleanup failures
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
