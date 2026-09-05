/**
 * DSSA Room Attendance System
 * Host Session Attendance Snapshot & Reconciliation API
 * GET /api/host/sessions/[id]/attendance
 * Phase 15: Realtime Live Attendance
 */

import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { AppRole as PrismaAppRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await props.params;

    // 1. Authenticate user via Clerk
    const userContext = await getCurrentUserWithRole();
    if (!userContext) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2. Query MySQL User for authoritative role
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userContext.userId },
      select: { id: true, role: true },
    });

    if (!dbUser || dbUser.role === PrismaAppRole.PENDING || dbUser.role === PrismaAppRole.MEMBER) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to access session attendance data." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Query Session with Room and AttendanceRecords
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        room: {
          select: { name: true, code: true, radiusMeters: true, isActive: true },
        },
        records: {
          orderBy: { markedAt: "desc" },
          take: 100, // Reasonable snapshot limit for live monitoring
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: { records: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4. Enforce ownership check for HOST role
    const isSuperAdminOrAdmin =
      dbUser.role === PrismaAppRole.SUPER_ADMIN || dbUser.role === PrismaAppRole.ADMIN;

    if (!isSuperAdminOrAdmin && session.hostUserId !== dbUser.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view attendance for this session." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 5. Format sanitized response
    const formattedRecords = session.records.map((r) => ({
      id: r.id,
      userId: r.userId,
      attendeeName: r.user?.name || r.user?.email || "Attendee",
      status: r.status,
      markedAt: r.markedAt.toISOString(),
    }));

    return NextResponse.json(
      {
        session: {
          id: session.id,
          title: session.title,
          status: session.status,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt?.toISOString() || null,
          room: session.room,
          totalPresent: session._count.records,
        },
        records: formattedRecords,
        syncedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("[HostAttendanceSnapshot] Error loading attendance snapshot:", err);
    return NextResponse.json(
      { error: "Failed to load attendance snapshot." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
