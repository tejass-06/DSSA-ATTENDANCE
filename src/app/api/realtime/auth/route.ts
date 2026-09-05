/**
 * DSSA Room Attendance System
 * Realtime Private Channel Authorization Endpoint
 * POST /api/realtime/auth
 * Phase 15: Realtime Live Attendance
 */

import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { AppRole as PrismaAppRole } from "@prisma/client";
import { parseSessionIdFromChannel } from "@/lib/realtime/events";
import Pusher from "pusher";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user identity via Clerk
    const userContext = await getCurrentUserWithRole();
    if (!userContext) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2. Query MySQL User for authoritative application role
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userContext.userId },
      select: { id: true, role: true },
    });

    if (!dbUser || dbUser.role === PrismaAppRole.PENDING || dbUser.role === PrismaAppRole.MEMBER) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to subscribe to live attendance channels." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Parse request parameters (supports both JSON body and form-urlencoded)
    let socketId = "";
    let channelName = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      socketId = typeof body.socket_id === "string" ? body.socket_id : "";
      channelName = typeof body.channel_name === "string" ? body.channel_name : "";
    } else {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        socketId = (formData.get("socket_id") as string) || "";
        channelName = (formData.get("channel_name") as string) || "";
      }
    }

    if (!channelName) {
      return NextResponse.json(
        { error: "Malformed request: channel_name is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4. Validate channel format & extract sessionId
    const targetSessionId = parseSessionIdFromChannel(channelName);
    if (!targetSessionId) {
      return NextResponse.json(
        { error: "Forbidden: Invalid or unsupported channel name." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 5. Query session to verify ownership & access boundaries
    const session = await prisma.attendanceSession.findUnique({
      where: { id: targetSessionId },
      select: { id: true, hostUserId: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 6. Enforce role-based access rules:
    // - SUPER_ADMIN / ADMIN: full monitoring access
    // - HOST: access permitted ONLY for sessions created by this host
    const isSuperAdminOrAdmin =
      dbUser.role === PrismaAppRole.SUPER_ADMIN || dbUser.role === PrismaAppRole.ADMIN;

    if (!isSuperAdminOrAdmin) {
      if (session.hostUserId !== dbUser.id) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to monitor this session." },
          { status: 403, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    // 7. Authorize channel with Pusher (or return fallback response in dev/test mode)
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

    if (appId && key && secret && socketId) {
      const pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Dev / Test mode fallback
    return NextResponse.json(
      {
        auth: `mock_auth_${dbUser.id}_${Date.now()}`,
        channel_data: JSON.stringify({ userId: dbUser.id, role: dbUser.role }),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[RealtimeAuth] Unexpected error during authorization:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during channel authorization." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
