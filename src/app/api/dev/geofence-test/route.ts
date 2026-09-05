/**
 * DSSA Room Attendance System
 * Comprehensive Phase 12 Room Geofencing & Boundary Enforcement Test Runner
 * GET /api/dev/geofence-test
 * Strictly disabled in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateQRChallenge } from "@/lib/qr/service";
import { evaluateGeofence } from "@/lib/geo/geofence";
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
    // ==========================================
    // 1. DETERMINISTIC UNIT TESTS: evaluateGeofence
    // ==========================================

    // Unit Test 1: Comfortably Inside (distance=10m, accuracy=5m, radius=30m) -> 10+5=15 <= 30
    const u1 = evaluateGeofence(10, 5, 30);
    results.push({
      testNumber: 1,
      name: "Unit: Comfortably inside geofence (dist=10m, acc=5m, rad=30m)",
      expected: "status=INSIDE, allowed=true",
      actual: `status=${u1.status}, allowed=${u1.allowed}`,
      passed: u1.status === "INSIDE" && u1.allowed === true,
    });

    // Unit Test 2: Comfortably Outside (distance=50m, accuracy=5m, radius=30m) -> 50-5=45 > 30
    const u2 = evaluateGeofence(50, 5, 30);
    results.push({
      testNumber: 2,
      name: "Unit: Comfortably outside geofence (dist=50m, acc=5m, rad=30m)",
      expected: "status=OUTSIDE, allowed=false, code=LOCATION_OUTSIDE",
      actual: `status=${u2.status}, allowed=${u2.allowed}, code=${u2.errorCode}`,
      passed: u2.status === "OUTSIDE" && u2.allowed === false && u2.errorCode === "LOCATION_OUTSIDE",
    });

    // Unit Test 3: Exact Boundary with zero accuracy (distance=30m, accuracy=0m, radius=30m)
    const u3 = evaluateGeofence(30, 0, 30);
    results.push({
      testNumber: 3,
      name: "Unit: Exact boundary with zero accuracy (dist=30m, acc=0m, rad=30m)",
      expected: "status=INSIDE, allowed=true",
      actual: `status=${u3.status}, allowed=${u3.allowed}`,
      passed: u3.status === "INSIDE" && u3.allowed === true,
    });

    // Unit Test 4: Uncertain Boundary (distance=28m, accuracy=8m, radius=30m) -> 28+8=36 > 30 (overlaps boundary)
    const u4 = evaluateGeofence(28, 8, 30);
    results.push({
      testNumber: 4,
      name: "Unit: Uncertain boundary (dist=28m, acc=8m, rad=30m)",
      expected: "status=UNCERTAIN, allowed=false, code=LOCATION_UNCERTAIN",
      actual: `status=${u4.status}, allowed=${u4.allowed}, code=${u4.errorCode}`,
      passed: u4.status === "UNCERTAIN" && u4.allowed === false && u4.errorCode === "LOCATION_UNCERTAIN",
    });

    // Unit Test 5: Poor accuracy exceeding 100m limit (acc=120m)
    const u5 = evaluateGeofence(10, 120, 30);
    results.push({
      testNumber: 5,
      name: "Unit: Poor accuracy exceeding threshold (acc=120m)",
      expected: "allowed=false, code=LOCATION_ACCURACY_TOO_LOW",
      actual: `status=${u5.status}, allowed=${u5.allowed}, code=${u5.errorCode}`,
      passed: u5.allowed === false && u5.errorCode === "LOCATION_ACCURACY_TOO_LOW",
    });

    // Unit Test 6: Invalid room radius (radius=2m < MIN_ROOM_RADIUS_METERS=5m)
    const u6 = evaluateGeofence(1, 0, 2);
    results.push({
      testNumber: 6,
      name: "Unit: Invalid room radius (< 5m)",
      expected: "status=INVALID, allowed=false, code=INVALID_RADIUS",
      actual: `status=${u6.status}, allowed=${u6.allowed}, code=${u6.errorCode}`,
      passed: u6.status === "INVALID" && u6.allowed === false && u6.errorCode === "INVALID_RADIUS",
    });

    // ==========================================
    // 2. INTEGRATION TESTS WITH SERVER ATTENDANCE
    // ==========================================

    // Setup Room: Nagpur SCET Committee Room (Lat: 21.0965000, Lon: 79.1670000, Radius: 30m)
    const roomA = await prisma.room.create({
      data: {
        name: "DSSA Committee Room Phase 12",
        code: `TEST-RM12A-${Date.now()}`,
        latitude: 21.0965000,
        longitude: 79.1670000,
        radiusMeters: 30,
        isActive: true,
      },
    });

    const roomB = await prisma.room.create({
      data: {
        name: "DSSA Lab 2 Phase 12",
        code: `TEST-RM12B-${Date.now()}`,
        latitude: 21.1458000,
        longitude: 79.0882000,
        radiusMeters: 25,
        isActive: true,
      },
    });

    const hostUser = await prisma.user.create({
      data: {
        clerkId: `user_test_host12_${Date.now()}`,
        email: `host12_${Date.now()}@dssa.edu`,
        name: "Host User 12",
        role: AppRole.HOST,
      },
    });

    const memberUserA = await prisma.user.create({
      data: {
        clerkId: `user_test_mem12A_${Date.now()}`,
        email: `mem12A_${Date.now()}@dssa.edu`,
        name: "Member 12A",
        role: AppRole.MEMBER,
      },
    });

    const memberUserB = await prisma.user.create({
      data: {
        clerkId: `user_test_mem12B_${Date.now()}`,
        email: `mem12B_${Date.now()}@dssa.edu`,
        name: "Member 12B",
        role: AppRole.MEMBER,
      },
    });

    const sessionA = await prisma.attendanceSession.create({
      data: {
        roomId: roomA.id,
        hostUserId: hostUser.id,
        title: "Phase 12 Geofence Test Session",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });

    const challengeA = await generateQRChallenge(sessionA.id);

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

    // Test 7: Clearly inside room radius (distance ~4.4m, accuracy=5m, radius=30m) -> 4.4 + 5 = 9.4 <= 30m
    const insideCoords = {
      latitude: 21.0965400,
      longitude: 79.1670000,
      accuracy: 5.0,
    };
    const res7 = await processAttendanceSubmission(memberAContext, challengeA.payload, insideCoords);
    results.push({
      testNumber: 7,
      name: "Integration: Distance clearly inside geofence radius",
      expected: "Success=true, status=PRESENT, distance <= 10m",
      actual: `Success=${res7.success}, Distance=${res7.record?.distanceMeters}m`,
      passed: res7.success === true && (res7.record?.distanceMeters ?? 999) <= 10,
    });

    // Test 8: Clearly outside room radius (distance ~150m away, radius=30m)
    // Offset lat by ~0.0015 deg (~166m)
    const outsideCoords = {
      latitude: 21.0980000,
      longitude: 79.1670000,
      accuracy: 10.0,
    };
    const tempMember8 = await prisma.user.create({
      data: {
        clerkId: `user_test_m8_${Date.now()}`,
        email: `m8_${Date.now()}@dssa.edu`,
        name: "Member 8",
        role: AppRole.MEMBER,
      },
    });
    const challenge8 = await generateQRChallenge(sessionA.id);
    const res8 = await processAttendanceSubmission(
      { userId: tempMember8.clerkId, role: "MEMBER", email: tempMember8.email, name: tempMember8.name! },
      challenge8.payload,
      outsideCoords
    );
    results.push({
      testNumber: 8,
      name: "Integration: Distance clearly outside geofence radius (~166m)",
      expected: "Success=false, ErrorCode=LOCATION_OUTSIDE",
      actual: `Success=${res8.success}, ErrorCode=${res8.errorCode}`,
      passed: res8.success === false && res8.errorCode === "LOCATION_OUTSIDE",
    });

    // Test 9: Boundary uncertainty (distance=25m, accuracy=15m, radius=30m -> 25+15=40m > 30m)
    // Offset lat by ~0.000225 deg (~25m)
    const uncertainCoords = {
      latitude: 21.0967250,
      longitude: 79.1670000,
      accuracy: 15.0,
    };
    const tempMember9 = await prisma.user.create({
      data: {
        clerkId: `user_test_m9_${Date.now()}`,
        email: `m9_${Date.now()}@dssa.edu`,
        name: "Member 9",
        role: AppRole.MEMBER,
      },
    });
    const challenge9 = await generateQRChallenge(sessionA.id);
    const res9 = await processAttendanceSubmission(
      { userId: tempMember9.clerkId, role: "MEMBER", email: tempMember9.email, name: tempMember9.name! },
      challenge9.payload,
      uncertainCoords
    );
    results.push({
      testNumber: 9,
      name: "Integration: Boundary uncertainty overlaps geofence (dist=25m, acc=15m, rad=30m)",
      expected: "Success=false, ErrorCode=LOCATION_UNCERTAIN",
      actual: `Success=${res9.success}, ErrorCode=${res9.errorCode}`,
      passed: res9.success === false && res9.errorCode === "LOCATION_UNCERTAIN",
    });

    // Test 10: Client attempts to send fake radius in location object
    const fakeRadiusCoords = {
      latitude: 21.0980000, // 166m away
      longitude: 79.1670000,
      accuracy: 5.0,
      radiusMeters: 5000, // Client tries to expand room radius to 5km
      radius: 5000,
    };
    const challenge10 = await generateQRChallenge(sessionA.id);
    const res10 = await processAttendanceSubmission(memberBContext, challenge10.payload, fakeRadiusCoords);
    results.push({
      testNumber: 10,
      name: "Integration: Client submits fake radius (5000m) while 166m outside",
      expected: "Server ignores client radius, enforces DB 30m radius, rejects as LOCATION_OUTSIDE",
      actual: `Success=${res10.success}, ErrorCode=${res10.errorCode}`,
      passed: res10.success === false && res10.errorCode === "LOCATION_OUTSIDE",
    });

    // Test 11: Client claims Room B while session belongs to Room A
    const fakeRoomCoords = {
      latitude: 21.1458000, // Coords of Room B
      longitude: 79.0882000,
      accuracy: 5.0,
      roomId: roomB.id, // Claiming Room B
    };
    const challenge11 = await generateQRChallenge(sessionA.id);
    const res11 = await processAttendanceSubmission(memberBContext, challenge11.payload, fakeRoomCoords);
    results.push({
      testNumber: 11,
      name: "Integration: Client claims Room B coordinates for Room A session",
      expected: "Server enforces Session A room (SCET Room A) and rejects distance to Room A (~10km away)",
      actual: `Success=${res11.success}, ErrorCode=${res11.errorCode}`,
      passed: res11.success === false && res11.errorCode === "LOCATION_OUTSIDE",
    });

    // Test 12: Inactive room in database fails closed
    const inactRoom = await prisma.room.create({
      data: {
        name: "Inactive Room 12",
        code: `INACT12-${Date.now()}`,
        latitude: 21.0965000,
        longitude: 79.1670000,
        radiusMeters: 30,
        isActive: false,
      },
    });
    const inactSession = await prisma.attendanceSession.create({
      data: {
        roomId: inactRoom.id,
        hostUserId: hostUser.id,
        title: "Inactive Room Session 12",
        status: SessionStatus.ACTIVE,
        startsAt: new Date(),
      },
    });
    const inactChallenge = await generateQRChallenge(inactSession.id);
    const res12 = await processAttendanceSubmission(memberBContext, inactChallenge.payload, insideCoords);
    results.push({
      testNumber: 12,
      name: "Integration: Room is marked isActive=false in database",
      expected: "Rejected with ROOM_INACTIVE",
      actual: `Success=${res12.success}, ErrorCode=${res12.errorCode}`,
      passed: res12.success === false && res12.errorCode === "ROOM_INACTIVE",
    });

    // Test 13: Two members independently submit from valid inside location
    const challenge13 = await generateQRChallenge(sessionA.id);
    const tempM1 = await prisma.user.create({
      data: { clerkId: `user_t1_${Date.now()}`, email: `t1_${Date.now()}@dssa.edu`, name: "M1", role: AppRole.MEMBER },
    });
    const tempM2 = await prisma.user.create({
      data: { clerkId: `user_t2_${Date.now()}`, email: `t2_${Date.now()}@dssa.edu`, name: "M2", role: AppRole.MEMBER },
    });
    const r13a = await processAttendanceSubmission(
      { userId: tempM1.clerkId, role: "MEMBER", email: tempM1.email, name: tempM1.name! },
      challenge13.payload,
      insideCoords
    );
    const r13b = await processAttendanceSubmission(
      { userId: tempM2.clerkId, role: "MEMBER", email: tempM2.email, name: tempM2.name! },
      challenge13.payload,
      insideCoords
    );
    results.push({
      testNumber: 13,
      name: "Integration: Two members submit from inside room geofence",
      expected: "Both independently succeed",
      actual: `M1Success=${r13a.success}, M2Success=${r13b.success}`,
      passed: r13a.success === true && r13b.success === true,
    });

    // Test 14: Duplicate attendance within geofence returns alreadyMarked: true
    const res14 = await processAttendanceSubmission(
      { userId: tempM1.clerkId, role: "MEMBER", email: tempM1.email, name: tempM1.name! },
      challenge13.payload,
      insideCoords
    );
    results.push({
      testNumber: 14,
      name: "Integration: Duplicate attendance within geofence",
      expected: "Success=true, alreadyMarked=true",
      actual: `Success=${res14.success}, alreadyMarked=${res14.alreadyMarked}`,
      passed: res14.success === true && res14.alreadyMarked === true,
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
            title: { in: ["Phase 12 Geofence Test Session", "Inactive Room Session 12"] },
          },
        },
      });
      await prisma.qRChallenge.deleteMany({
        where: {
          session: {
            title: { in: ["Phase 12 Geofence Test Session", "Inactive Room Session 12"] },
          },
        },
      });
      await prisma.auditLog.deleteMany({
        where: { entityType: "AttendanceRecord" },
      });
      await prisma.attendanceSession.deleteMany({
        where: {
          title: { in: ["Phase 12 Geofence Test Session", "Inactive Room Session 12"] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: { contains: "dssa.edu" },
        },
      });
      await prisma.room.deleteMany({
        where: {
          name: {
            in: [
              "DSSA Committee Room Phase 12",
              "DSSA Lab 2 Phase 12",
              "Inactive Room 12",
            ],
          },
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
