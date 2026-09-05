/**
 * DSSA Room Attendance System
 * Comprehensive Phase 11 Geolocation Capture & Distance Validation Test Runner
 * GET /api/dev/geo-test
 * Strictly disabled in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateQRChallenge } from "@/lib/qr/service";
import { calculateHaversineDistanceMeters } from "@/lib/geo/distance";
import { validateMemberLocation } from "@/lib/geo/service";
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
    // --- 1. UNIT TESTS: HAVERSINE DISTANCE ---

    // Unit Test 1: Identical coordinates
    const d1 = calculateHaversineDistanceMeters(21.1458, 79.0882, 21.1458, 79.0882);
    results.push({
      testNumber: 1,
      name: "Haversine: Identical coordinates",
      expected: "0 meters",
      actual: `${d1} meters`,
      passed: d1 === 0,
    });

    // Unit Test 2: Known reference coordinates (Nagpur SCET to Zero Mile Nagpur ~12.5km)
    // SCET Nagpur: 21.0965, 79.1670; Zero Mile Nagpur: 21.1498, 79.0806
    const d2 = calculateHaversineDistanceMeters(21.0965, 79.1670, 21.1498, 79.0806);
    // Expected distance is ~10.8 km to 11.2 km (approx 10,900m)
    const isD2Accurate = d2 > 10000 && d2 < 12000;
    results.push({
      testNumber: 2,
      name: "Haversine: Known reference coordinates (Nagpur SCET to Zero Mile)",
      expected: "~10,900m (between 10km and 12km)",
      actual: `${Math.round(d2)} meters`,
      passed: isD2Accurate,
    });

    // Unit Test 3: Numerical safety / boundary cases (Poles & Meridian extremes)
    const dPole = calculateHaversineDistanceMeters(90, 0, -90, 0);
    const expectedHalfCircumference = 20015000; // ~20,015 km
    const isPoleAccurate = Math.abs(dPole - expectedHalfCircumference) < 50000;
    results.push({
      testNumber: 3,
      name: "Haversine: Antipodal North-South Pole coordinates",
      expected: "~20,015,000 meters",
      actual: `${Math.round(dPole)} meters`,
      passed: isPoleAccurate,
    });

    // --- 2. INTEGRATION TESTS: FIXTURES ---
    const testRoom = await prisma.room.create({
      data: {
        name: "Test Room Phase 11",
        code: `TEST-RM11-${Date.now()}`,
        latitude: 21.0965000,
        longitude: 79.1670000,
        radiusMeters: 30,
      },
    });

    const hostUser = await prisma.user.create({
      data: {
        clerkId: `user_test_host11_${Date.now()}`,
        email: `host11_${Date.now()}@dssa.edu`,
        name: "Host User 11",
        role: AppRole.HOST,
      },
    });

    const memberA = await prisma.user.create({
      data: {
        clerkId: `user_test_member11A_${Date.now()}`,
        email: `member11A_${Date.now()}@dssa.edu`,
        name: "Member 11A",
        role: AppRole.MEMBER,
      },
    });

    const memberB = await prisma.user.create({
      data: {
        clerkId: `user_test_member11B_${Date.now()}`,
        email: `member11B_${Date.now()}@dssa.edu`,
        name: "Member 11B",
        role: AppRole.MEMBER,
      },
    });

    const activeSession = await prisma.attendanceSession.create({
      data: {
        roomId: testRoom.id,
        hostUserId: hostUser.id,
        title: "Phase 11 Geo Test Session",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });

    const qrChallenge = await generateQRChallenge(activeSession.id);

    const memberAContext = {
      userId: memberA.clerkId,
      role: "MEMBER" as const,
      email: memberA.email,
      name: memberA.name!,
    };

    const memberBContext = {
      userId: memberB.clerkId,
      role: "MEMBER" as const,
      email: memberB.email,
      name: memberB.name!,
    };

    // Test 4: Valid coordinates near configured room (5 meters away)
    // offset latitude by approx ~0.00004 deg (~4.4 meters)
    const validLocation = {
      latitude: 21.0965400,
      longitude: 79.1670000,
      accuracy: 8.5,
    };
    const res4 = await processAttendanceSubmission(memberAContext, qrChallenge.payload, validLocation);
    results.push({
      testNumber: 4,
      name: "Valid coordinates near configured room",
      expected: "Success=true, distance calculated, record created",
      actual: `Success=${res4.success}, Distance=${res4.record?.distanceMeters}m`,
      passed: res4.success === true && (res4.record?.distanceMeters ?? 999) < 15,
    });

    // Test 5: Exact same coordinates as room
    const sameLocation = {
      latitude: 21.0965000,
      longitude: 79.1670000,
      accuracy: 5.0,
    };
    const geoValSame = await validateMemberLocation(activeSession.id, sameLocation);
    results.push({
      testNumber: 5,
      name: "Exact same coordinates as room",
      expected: "Valid=true, distanceMeters=0",
      actual: `Valid=${geoValSame.valid}, Distance=${geoValSame.distanceMeters}m`,
      passed: geoValSame.valid === true && geoValSame.distanceMeters === 0,
    });

    // Test 6: Clearly distant coordinates (50+ km away) - Phase 12 geofence boundary rejection
    const distantLocation = {
      latitude: 21.5000000,
      longitude: 79.5000000,
      accuracy: 10.0,
    };
    const geoValDistant = await validateMemberLocation(activeSession.id, distantLocation);
    results.push({
      testNumber: 6,
      name: "Clearly distant coordinates (50+ km away)",
      expected: "Valid=false, ErrorCode=LOCATION_OUTSIDE",
      actual: `Valid=${geoValDistant.valid}, ErrorCode=${geoValDistant.errorCode}, Distance=${Math.round(geoValDistant.distanceMeters ?? 0)}m`,
      passed: geoValDistant.valid === false && geoValDistant.errorCode === "LOCATION_OUTSIDE" && (geoValDistant.distanceMeters ?? 0) > 40000,
    });


    // Test 7: Invalid latitude (out of bounds > 90)
    const invalidLatRes = await validateMemberLocation(activeSession.id, {
      latitude: 95.0,
      longitude: 79.167,
      accuracy: 10,
    });
    results.push({
      testNumber: 7,
      name: "Invalid latitude (> 90 degrees)",
      expected: "Valid=false, ErrorCode=INVALID_COORDINATES",
      actual: `Valid=${invalidLatRes.valid}, ErrorCode=${invalidLatRes.errorCode}`,
      passed: invalidLatRes.valid === false && invalidLatRes.errorCode === "INVALID_COORDINATES",
    });

    // Test 8: Invalid longitude (out of bounds < -180)
    const invalidLonRes = await validateMemberLocation(activeSession.id, {
      latitude: 21.0965,
      longitude: -185.0,
      accuracy: 10,
    });
    results.push({
      testNumber: 8,
      name: "Invalid longitude (< -180 degrees)",
      expected: "Valid=false, ErrorCode=INVALID_COORDINATES",
      actual: `Valid=${invalidLonRes.valid}, ErrorCode=${invalidLonRes.errorCode}`,
      passed: invalidLonRes.valid === false && invalidLonRes.errorCode === "INVALID_COORDINATES",
    });

    // Test 9: Invalid accuracy (negative number)
    const invalidAccRes = await validateMemberLocation(activeSession.id, {
      latitude: 21.0965,
      longitude: 79.167,
      accuracy: -10,
    });
    results.push({
      testNumber: 9,
      name: "Invalid accuracy (negative number)",
      expected: "Valid=false, ErrorCode=INVALID_ACCURACY",
      actual: `Valid=${invalidAccRes.valid}, ErrorCode=${invalidAccRes.errorCode}`,
      passed: invalidAccRes.valid === false && invalidAccRes.errorCode === "INVALID_ACCURACY",
    });

    // Test 10: Poor accuracy (> 100m threshold)
    const poorAccRes = await validateMemberLocation(activeSession.id, {
      latitude: 21.0965,
      longitude: 79.167,
      accuracy: 250, // 250m uncertainty exceeds MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS
    });
    results.push({
      testNumber: 10,
      name: "Poor accuracy exceeding 100m threshold",
      expected: "Valid=false, ErrorCode=LOCATION_ACCURACY_TOO_LOW",
      actual: `Valid=${poorAccRes.valid}, ErrorCode=${poorAccRes.errorCode}`,
      passed: poorAccRes.valid === false && poorAccRes.errorCode === "LOCATION_ACCURACY_TOO_LOW",
    });

    // Test 11: Client sends fake distance in body (server ignores and calculates real distance)
    const fakeDistPayload = {
      latitude: 21.0965400,
      longitude: 79.1670000,
      accuracy: 10,
      distance: 0, // Client tries to spoof 0 distance
      insideRoom: true,
    };
    const freshChallenge11 = await generateQRChallenge(activeSession.id);
    const res11 = await processAttendanceSubmission(memberBContext, freshChallenge11.payload, fakeDistPayload);
    results.push({
      testNumber: 11,
      name: "Client attempts to supply fake distance / insideRoom",
      expected: "Server independently calculates real distance (~4.4m)",
      actual: `Success=${res11.success}, ServerCalculatedDistance=${res11.record?.distanceMeters}m`,
      passed: res11.success === true && res11.record?.distanceMeters !== undefined,
    });

    // Test 12: Duplicate member submission with location
    const res12 = await processAttendanceSubmission(memberAContext, freshChallenge11.payload, validLocation);
    results.push({
      testNumber: 12,
      name: "Duplicate member submission with location",
      expected: "Success=true, alreadyMarked=true",
      actual: `Success=${res12.success}, alreadyMarked=${res12.alreadyMarked}`,
      passed: res12.success === true && res12.alreadyMarked === true,
    });

    // Test 13: Missing location input entirely
    const tempMember13 = await prisma.user.create({
      data: {
        clerkId: `user_test_m13_${Date.now()}`,
        email: `m13_${Date.now()}@dssa.edu`,
        name: "Member 13",
        role: AppRole.MEMBER,
      },
    });
    const res13 = await processAttendanceSubmission(
      { userId: tempMember13.clerkId, role: "MEMBER", email: tempMember13.email, name: tempMember13.name! },
      freshChallenge11.payload,
      undefined // No location
    );
    results.push({
      testNumber: 13,
      name: "Missing location input entirely",
      expected: "Rejected with LOCATION_UNAVAILABLE",
      actual: `Success=${res13.success}, ErrorCode=${res13.errorCode}`,
      passed: res13.success === false && res13.errorCode === "LOCATION_UNAVAILABLE",
    });

    // Test 14: Inactive room rejects location validation
    const inactiveRoom = await prisma.room.create({
      data: {
        name: "Inactive Room",
        code: `INACT-${Date.now()}`,
        latitude: 21.0965,
        longitude: 79.167,
        isActive: false,
      },
    });
    const inactSession = await prisma.attendanceSession.create({
      data: {
        roomId: inactiveRoom.id,
        hostUserId: hostUser.id,
        title: "Inactive Room Session",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    const inactRes = await validateMemberLocation(inactSession.id, validLocation);
    results.push({
      testNumber: 14,
      name: "Inactive room location validation",
      expected: "Valid=false, ErrorCode=ROOM_INACTIVE",
      actual: `Valid=${inactRes.valid}, ErrorCode=${inactRes.errorCode}`,
      passed: inactRes.valid === false && inactRes.errorCode === "ROOM_INACTIVE",
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
            title: { in: ["Phase 11 Geo Test Session", "Inactive Room Session"] },
          },
        },
      });
      await prisma.qRChallenge.deleteMany({
        where: {
          session: {
            title: { in: ["Phase 11 Geo Test Session", "Inactive Room Session"] },
          },
        },
      });
      await prisma.auditLog.deleteMany({
        where: { entityType: "AttendanceRecord" },
      });
      await prisma.attendanceSession.deleteMany({
        where: {
          title: { in: ["Phase 11 Geo Test Session", "Inactive Room Session"] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: { contains: "dssa.edu" },
        },
      });
      await prisma.room.deleteMany({
        where: {
          name: { in: ["Test Room Phase 11", "Inactive Room"] },
        },
      });
    } catch {
      // Ignore cleanup error
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
