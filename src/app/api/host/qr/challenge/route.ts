/**
 * DSSA Room Attendance System
 * POST /api/host/qr/challenge — Rotating QR challenge endpoint
 * Phase 9: Rotating QR Attendance System
 */
import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/server";
import { hasMinimumRole, appRoleToPrismaRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { generateQRChallenge } from "@/lib/qr/service";
import { SessionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user from Clerk server session
    const authUser = await getCurrentUserWithRole();
    if (!authUser) {
      return NextResponse.json({ error: "UNAUTHENTICATED", message: "Authentication required." }, { status: 401 });
    }

    // 2. Authorize role (HOST, ADMIN, or SUPER_ADMIN)
    if (!hasMinimumRole(authUser.role, "HOST")) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Host authorization required." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "INVALID_INPUT", message: "Valid sessionId is required." }, { status: 400 });
    }

    // 3. Resolve MySQL user
    const prismaRole = appRoleToPrismaRole(authUser.role);
    const dbUser = await prisma.user.upsert({
      where: { clerkId: authUser.userId },
      update: { email: authUser.email, name: authUser.name, role: prismaRole },
      create: { clerkId: authUser.userId, email: authUser.email, name: authUser.name, role: prismaRole },
    });

    // 4. Verify session exists and is ACTIVE
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      select: { id: true, hostUserId: true, status: true },
    });

    if (!session) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Attendance session not found." }, { status: 404 });
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return NextResponse.json(
        { error: "SESSION_INACTIVE", message: `Session is not active (status: ${session.status}).` },
        { status: 400 }
      );
    }

    // 5. Verify ownership: caller must be session host or ADMIN/SUPER_ADMIN
    const isOwner = session.hostUserId === dbUser.id;
    const isElevatedAdmin = authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";

    if (!isOwner && !isElevatedAdmin) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "You are not authorized to operate this session." }, { status: 403 });
    }

    // 6. Generate fresh rotating QR challenge
    const challenge = await generateQRChallenge(sessionId);

    return NextResponse.json(
      {
        success: true,
        challenge: {
          challengeId: challenge.challengeId,
          payload: challenge.payload,
          issuedAt: challenge.issuedAt,
          expiresAt: challenge.expiresAt,
          ttlMs: challenge.ttlMs,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}
