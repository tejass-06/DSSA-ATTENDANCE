/**
 * DSSA Room Attendance System
 * GET /api/admin/attendance/export
 * Secure Server-Side CSV Export API
 * Phase 16: Attendance & Admin Management
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/server";
import { hasMinimumRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { generateAttendanceCsv } from "@/lib/csv/export";
import { AttendanceStatus, Prisma } from "@prisma/client";

const MAX_EXPORT_ROW_LIMIT = 5000;

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user & verify MySQL role authoritative
    const user = await getCurrentUserWithRole();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!hasMinimumRole(user.role, "ADMIN")) {
      return NextResponse.json(
        { error: "FORBIDDEN: Admin privileges required for system-wide CSV export." },
        { status: 403 }
      );
    }

    // 2. Parse & sanitize filter parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status")?.toUpperCase();
    const roomId = searchParams.get("roomId")?.trim();
    const sessionId = searchParams.get("sessionId")?.trim();
    const search = searchParams.get("search")?.trim();
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Build Prisma query condition
    const where: Prisma.AttendanceRecordWhereInput = {};

    if (
      statusParam &&
      Object.values(AttendanceStatus).includes(statusParam as AttendanceStatus)
    ) {
      where.status = statusParam as AttendanceStatus;
    }

    if (roomId) {
      where.session = {
        ...(where.session as Prisma.AttendanceSessionWhereInput),
        roomId: roomId,
      };
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    if (startDateParam || endDateParam) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        if (!isNaN(start.getTime())) {
          dateFilter.gte = start;
        }
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        if (!isNaN(end.getTime())) {
          dateFilter.lte = end;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where.markedAt = dateFilter;
      }
    }

    // 3. Check total matching count to prevent excessive database stress
    const count = await prisma.attendanceRecord.count({ where });

    if (count > MAX_EXPORT_ROW_LIMIT) {
      return NextResponse.json(
        {
          error: "EXPORT_LIMIT_EXCEEDED",
          message: `The export matched ${count} rows, which exceeds the maximum allowed limit of ${MAX_EXPORT_ROW_LIMIT}. Please narrow your date range or filters.`,
        },
        { status: 400 }
      );
    }

    // 4. Query verified records with relations
    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { markedAt: "desc" },
      take: MAX_EXPORT_ROW_LIMIT,
      select: {
        id: true,
        markedAt: true,
        status: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        session: {
          select: {
            title: true,
            room: {
              select: {
                name: true,
                code: true,
              },
            },
            host: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // 5. Generate sanitized CSV text
    const csvContent = generateAttendanceCsv(records);

    // 6. Record Audit Log entry
    const dbActor = await prisma.user.findUnique({
      where: { clerkId: user.userId },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: dbActor?.id || null,
        action: "ATTENDANCE_CSV_EXPORTED",
        entityType: "AttendanceRecord",
        entityId: "SYSTEM_EXPORT",
        metadata: JSON.stringify({
          rowCount: records.length,
          filters: {
            status: statusParam || "ALL",
            roomId: roomId || "ALL",
            sessionId: sessionId || "ALL",
            search: search || null,
            startDate: startDateParam || null,
            endDate: endDateParam || null,
          },
        }),
      },
    });

    // 7. Format filename with current date
    const dateStamp = new Date().toISOString().split("T")[0];
    const filename = `dssa-attendance-${dateStamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[CSV_EXPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during CSV generation" },
      { status: 500 }
    );
  }
}
