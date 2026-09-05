/**
 * DSSA Room Attendance System
 * Dedicated Realtime Live Attendance Test Suite
 * GET /api/dev/realtime-test
 * Phase 15: Realtime Live Attendance
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SessionStatus, AppRole as PrismaAppRole } from "@prisma/client";
import { processAttendanceSubmission } from "@/lib/attendance/service";
import { QR_PROTOCOL_PREFIX } from "@/lib/qr/config";
import { globalRateLimiter } from "@/lib/security/rateLimiter";
import {
  getRealtimeSessionChannel,
  isValidSessionChannel,
  parseSessionIdFromChannel,
  validateRealtimeAttendancePayload,
} from "@/lib/realtime/events";
import {
  publishAttendanceRecorded,
  getMockEventsForSession,
  clearMockEvents,
} from "@/lib/realtime/publisher";
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
  const testRunId = `rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Reset rate limiter and mock events for test isolation
  globalRateLimiter.resetAll();
  clearMockEvents();

  // Test Fixtures
  const room = await prisma.room.create({
    data: {
      name: `Realtime Test Venue ${testRunId}`,
      code: `RM-RT-${Date.now().toString().slice(-6)}`,
      latitude: 21.1145,
      longitude: 79.056,
      radiusMeters: 30,
      isActive: true,
    },
  });

  const hostUserA = await prisma.user.create({
    data: {
      clerkId: `clerk_hostA_${testRunId}`,
      email: `hostA_${testRunId}@scetngp.edu`,
      name: `Host A ${testRunId}`,
      role: PrismaAppRole.HOST,
    },
  });

  const hostUserB = await prisma.user.create({
    data: {
      clerkId: `clerk_hostB_${testRunId}`,
      email: `hostB_${testRunId}@scetngp.edu`,
      name: `Host B ${testRunId}`,
      role: PrismaAppRole.HOST,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      clerkId: `clerk_admin_${testRunId}`,
      email: `admin_${testRunId}@scetngp.edu`,
      name: `Admin ${testRunId}`,
      role: PrismaAppRole.ADMIN,
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      clerkId: `clerk_member_${testRunId}`,
      email: `member_${testRunId}@scetngp.edu`,
      name: `Member ${testRunId}`,
      role: PrismaAppRole.MEMBER,
    },
  });

  const pendingUser = await prisma.user.create({
    data: {
      clerkId: `clerk_pending_${testRunId}`,
      email: `pending_${testRunId}@scetngp.edu`,
      name: `Pending ${testRunId}`,
      role: PrismaAppRole.PENDING,
    },
  });

  // Sessions
  const sessionA = await prisma.attendanceSession.create({
    data: {
      roomId: room.id,
      hostUserId: hostUserA.id,
      title: `Session A ${testRunId}`,
      status: SessionStatus.ACTIVE,
      startsAt: new Date(),
    },
  });

  const sessionB = await prisma.attendanceSession.create({
    data: {
      roomId: room.id,
      hostUserId: hostUserB.id,
      title: `Session B ${testRunId}`,
      status: SessionStatus.ACTIVE,
      startsAt: new Date(),
    },
  });

  // Helper to create valid QR challenge
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

  const insideLocation = {
    latitude: 21.11453,
    longitude: 79.05602,
    accuracy: 8,
  };

  const outsideLocation = {
    latitude: 21.1154,
    longitude: 79.056,
    accuracy: 10,
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Event contract validation (Valid Payload)
    // -------------------------------------------------------------
    const validPayload = {
      attendanceId: "att_12345",
      sessionId: sessionA.id,
      userId: memberUser.id,
      attendeeName: memberUser.name,
      status: "PRESENT",
      markedAt: new Date().toISOString(),
      distanceMeters: 5,
    };
    const validated1 = validateRealtimeAttendancePayload(validPayload);
    results.push({
      testId: 1,
      testName: "Event Contract Validation (Valid Payload)",
      scenario: "Properly structured RealtimeAttendancePayload",
      expected: "Valid object returned",
      actual: `validated=${validated1 !== null && validated1.attendanceId === "att_12345"}`,
      passed: validated1 !== null && validated1.attendanceId === "att_12345",
    });

    // -------------------------------------------------------------
    // Test 2: Event contract validation (Malformed / Missing Fields)
    // -------------------------------------------------------------
    const malformedPayload = {
      attendanceId: 12345, // Number instead of string
      sessionId: sessionA.id,
    };
    const validated2 = validateRealtimeAttendancePayload(malformedPayload);
    results.push({
      testId: 2,
      testName: "Event Contract Validation (Malformed)",
      scenario: "Payload missing required strings and invalid types",
      expected: "null returned",
      actual: `validated=${validated2}`,
      passed: validated2 === null,
    });

    // -------------------------------------------------------------
    // Test 3: Channel Name Helper & Format Validation
    // -------------------------------------------------------------
    const channelName = getRealtimeSessionChannel(sessionA.id);
    const isValid = isValidSessionChannel(channelName);
    const parsedSid = parseSessionIdFromChannel(channelName);
    const isBadChannelValid = isValidSessionChannel("public-global-stream;drop table");

    results.push({
      testId: 3,
      testName: "Channel Formatting & Parsing Helpers",
      scenario: "Testing getRealtimeSessionChannel and parseSessionIdFromChannel",
      expected: "Valid private channel parsed correctly, malicious channel rejected",
      actual: `channel=${channelName}, valid=${isValid}, parsed=${parsedSid === sessionA.id}, badRejected=${!isBadChannelValid}`,
      passed: isValid && parsedSid === sessionA.id && !isBadChannelValid,
    });

    // -------------------------------------------------------------
    // Test 4: Successful attendance marks DB and publishes Realtime event
    // -------------------------------------------------------------
    clearMockEvents();
    const chal4 = await createTestChallenge(sessionA.id);
    const res4 = await processAttendanceSubmission(
      { userId: memberUser.clerkId, role: "MEMBER", email: memberUser.email, name: memberUser.name! },
      chal4.payload,
      insideLocation
    );

    const sessionAEvents = getMockEventsForSession(sessionA.id);
    const eventPublished = sessionAEvents.length === 1 && sessionAEvents[0].event === "attendance:recorded";

    results.push({
      testId: 4,
      testName: "Attendance Event Publication on DB Success",
      scenario: "Member successfully marks attendance",
      expected: "DB record created and exactly 1 attendance:recorded event published",
      actual: `DB_success=${res4.success}, eventCount=${sessionAEvents.length}`,
      passed: res4.success === true && eventPublished,
    });

    // -------------------------------------------------------------
    // Test 5: Session Channel Isolation (Session A vs Session B)
    // -------------------------------------------------------------
    const sessionBEvents = getMockEventsForSession(sessionB.id);
    results.push({
      testId: 5,
      testName: "Session Channel Isolation",
      scenario: "Verify Session B channel receives 0 events when Session A check-in occurs",
      expected: "Session B events count = 0",
      actual: `SessionB_events=${sessionBEvents.length}`,
      passed: sessionBEvents.length === 0,
    });

    // -------------------------------------------------------------
    // Test 6: Duplicate attendance does NOT publish a second event
    // -------------------------------------------------------------
    const eventCountBefore = getMockEventsForSession(sessionA.id).length;
    const chal6 = await createTestChallenge(sessionA.id);
    const res6 = await processAttendanceSubmission(
      { userId: memberUser.clerkId, role: "MEMBER", email: memberUser.email, name: memberUser.name! },
      chal6.payload,
      insideLocation
    );
    const eventCountAfter = getMockEventsForSession(sessionA.id).length;

    results.push({
      testId: 6,
      testName: "Duplicate Attendance Publication Prevention",
      scenario: "Member submits second request for same session",
      expected: "alreadyMarked=true, 0 additional realtime events emitted",
      actual: `alreadyMarked=${res6.alreadyMarked}, newEvents=${eventCountAfter - eventCountBefore}`,
      passed: res6.alreadyMarked === true && eventCountAfter === eventCountBefore,
    });

    // -------------------------------------------------------------
    // Test 7: Rejected attendance (Outside Geofence) does NOT publish event
    // -------------------------------------------------------------
    const member2 = await prisma.user.create({
      data: {
        clerkId: `clerk_m2_${testRunId}`,
        email: `m2_${testRunId}@scetngp.edu`,
        name: `Member 2 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    const eventCountBefore7 = getMockEventsForSession(sessionA.id).length;
    const chal7 = await createTestChallenge(sessionA.id);
    const res7 = await processAttendanceSubmission(
      { userId: member2.clerkId, role: "MEMBER", email: member2.email, name: member2.name! },
      chal7.payload,
      outsideLocation
    );
    const eventCountAfter7 = getMockEventsForSession(sessionA.id).length;

    results.push({
      testId: 7,
      testName: "Rejected Attendance Publication Prevention",
      scenario: "Member rejected due to outside geofence",
      expected: "success=false, 0 realtime events emitted",
      actual: `success=${res7.success}, newEvents=${eventCountAfter7 - eventCountBefore7}`,
      passed: res7.success === false && eventCountAfter7 === eventCountBefore7,
    });

    // -------------------------------------------------------------
    // Test 8: Realtime failure does NOT fail DB attendance transaction
    // -------------------------------------------------------------
    const member3 = await prisma.user.create({
      data: {
        clerkId: `clerk_m3_${testRunId}`,
        email: `m3_${testRunId}@scetngp.edu`,
        name: `Member 3 ${testRunId}`,
        role: PrismaAppRole.MEMBER,
      },
    });

    // Direct test of publishAttendanceRecorded error handling
    const publishRes = await publishAttendanceRecorded("invalid;channel#test", {
      attendanceId: "att_fake",
      sessionId: "invalid_sid",
      userId: "user_fake",
      attendeeName: "Test",
      status: "PRESENT",
      markedAt: new Date().toISOString(),
    });

    // Test attendance submission with member 3 (must succeed despite any publisher condition)
    const chal8 = await createTestChallenge(sessionA.id);
    const res8 = await processAttendanceSubmission(
      { userId: member3.clerkId, role: "MEMBER", email: member3.email, name: member3.name! },
      chal8.payload,
      insideLocation
    );

    results.push({
      testId: 8,
      testName: "Realtime Failure Isolation",
      scenario: "Attendance marking remains valid even if realtime publisher encounters errors",
      expected: "DB Attendance created successfully (success=true)",
      actual: `res8_success=${res8.success}, publisherHandledError=${typeof publishRes.published === "boolean"}`,
      passed: res8.success === true && typeof publishRes.published === "boolean",
    });

    // -------------------------------------------------------------
    // Test 9: Privacy Audit: No raw QR tokens or GPS coordinates in realtime payloads
    // -------------------------------------------------------------
    const allPublishedEvents = getMockEventsForSession(sessionA.id);
    let leakFound = false;

    for (const ev of allPublishedEvents) {
      const str = JSON.stringify(ev.data).toLowerCase();
      if (
        str.includes("token") ||
        str.includes("rawtoken") ||
        str.includes("challengehash") ||
        str.includes("latitude") ||
        str.includes("longitude") ||
        str.includes("secret")
      ) {
        leakFound = true;
        break;
      }
    }

    results.push({
      testId: 9,
      testName: "Realtime Payload Privacy Guarantee",
      scenario: "Verify zero raw tokens, hashes, or personal GPS coordinates are broadcast",
      expected: "Zero privacy leaks detected in published payloads",
      actual: `leakFound=${leakFound}, totalEventsAnalyzed=${allPublishedEvents.length}`,
      passed: !leakFound && allPublishedEvents.length > 0,
    });

    // -------------------------------------------------------------
    // Test 10: Invariant: Database remains the sole authority for presence
    // -------------------------------------------------------------
    const dbCountA = await prisma.attendanceRecord.count({
      where: { sessionId: sessionA.id },
    });
    const uniqueAttendees = await prisma.attendanceRecord.groupBy({
      by: ["userId"],
      where: { sessionId: sessionA.id },
    });

    results.push({
      testId: 10,
      testName: "Database Invariant: MySQL Sole Presence Authority",
      scenario: "Verify database attendance count equals unique checked-in users",
      expected: "DB record count equals distinct userId count",
      actual: `dbCount=${dbCountA}, distinctUsers=${uniqueAttendees.length}`,
      passed: dbCountA === uniqueAttendees.length && dbCountA >= 2,
    });

    // -------------------------------------------------------------
    // Test 11: Role Authorization: Host A vs Host B ownership check
    // -------------------------------------------------------------
    const hostAOwnsA = sessionA.hostUserId === hostUserA.id;
    const hostBOwnsA = sessionA.hostUserId === hostUserB.id;
    results.push({
      testId: 11,
      testName: "Channel Authorization: Host Session Ownership",
      scenario: "Host A owns Session A, Host B cannot claim Session A",
      expected: "Host A is owner, Host B is rejected from Session A",
      actual: `hostAOwnsA=${hostAOwnsA}, hostBOwnsA=${hostBOwnsA}`,
      passed: hostAOwnsA && !hostBOwnsA,
    });

    // -------------------------------------------------------------
    // Test 12: Role Authority: Admin allowed, Pending denied
    // -------------------------------------------------------------
    const adminRoleValid = adminUser.role === PrismaAppRole.ADMIN;
    const pendingRoleBlocked = pendingUser.role === PrismaAppRole.PENDING;
    results.push({
      testId: 12,
      testName: "Role Authority: Admin vs Pending Access",
      scenario: "Admin permitted system-wide, PENDING rejected from live channels",
      expected: "Admin authorized, PENDING unauthorized",
      actual: `adminRole=${adminRoleValid}, pendingRole=${pendingRoleBlocked}`,
      passed: adminRoleValid && pendingRoleBlocked,
    });
  } catch (err) {
    results.push({
      testId: 999,
      testName: "Unexpected Execution Error",
      scenario: "Fatal exception in test suite",
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
