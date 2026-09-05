"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/server";
import { appRoleToPrismaRole, type AppRole } from "@/lib/auth/roles";
import { SessionStatus } from "@prisma/client";

export type SessionActionResult =
  | { success: true; session?: { id: string; title: string; status: SessionStatus; startsAt: Date } }
  | { success: false; error: string; message: string };

/**
 * Helper to resolve and ensure MySQL User record exists for authenticated Clerk user
 */
async function getOrCreateDbUser(clerkId: string, email: string, name: string, roleStr: string) {
  const prismaRole = appRoleToPrismaRole(roleStr as AppRole);

  const dbUser = await prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      name,
      role: prismaRole,
    },
    create: {
      clerkId,
      email,
      name,
      role: prismaRole,
    },
  });

  return dbUser;
}

/**
 * Server Action: Start a new room attendance session
 */
export async function startHostSession(roomId: string, customTitle?: string): Promise<SessionActionResult> {
  try {
    // 1. Enforce server-side role authorization (HOST, ADMIN, or SUPER_ADMIN)
    const authUser = await requireRole("HOST");

    if (!roomId || typeof roomId !== "string") {
      return { success: false, error: "INVALID_INPUT", message: "A valid Room ID is required." };
    }

    // 2. Map authenticated identity to MySQL user
    const dbUser = await getOrCreateDbUser(
      authUser.userId,
      authUser.email,
      authUser.name,
      authUser.role
    );

    // 3. Execute atomic transaction to prevent race conditions and duplicate sessions
    const createdSession = await prisma.$transaction(async (tx) => {
      // Check if host already has an active session
      const hostActiveSession = await tx.attendanceSession.findFirst({
        where: {
          hostUserId: dbUser.id,
          status: SessionStatus.ACTIVE,
        },
      });

      if (hostActiveSession) {
        throw new Error("ACTIVE_SESSION_EXISTS: You already have an active session in progress.");
      }

      // Check if target room exists and is active
      const room = await tx.room.findUnique({
        where: { id: roomId },
      });

      if (!room || !room.isActive) {
        throw new Error("ROOM_UNAVAILABLE: The selected room does not exist or is inactive.");
      }

      // Check if room already has an active session from any host
      const roomActiveSession = await tx.attendanceSession.findFirst({
        where: {
          roomId: room.id,
          status: SessionStatus.ACTIVE,
        },
      });

      if (roomActiveSession) {
        throw new Error("ROOM_IN_USE: The selected room already has an active session.");
      }

      // Create new session
      const sessionTitle = customTitle?.trim() || `${room.name} Session`;

      return await tx.attendanceSession.create({
        data: {
          roomId: room.id,
          hostUserId: dbUser.id,
          title: sessionTitle,
          status: SessionStatus.ACTIVE,
          startsAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
        },
      });
    });

    // 4. Revalidate relevant cache paths
    revalidatePath("/host");
    revalidatePath("/admin");
    revalidatePath("/admin/sessions");

    return { success: true, session: createdSession };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    
    if (rawMessage.startsWith("ACTIVE_SESSION_EXISTS:")) {
      return { success: false, error: "ACTIVE_SESSION_EXISTS", message: rawMessage.replace("ACTIVE_SESSION_EXISTS: ", "") };
    }
    if (rawMessage.startsWith("ROOM_UNAVAILABLE:")) {
      return { success: false, error: "ROOM_UNAVAILABLE", message: rawMessage.replace("ROOM_UNAVAILABLE: ", "") };
    }
    if (rawMessage.startsWith("ROOM_IN_USE:")) {
      return { success: false, error: "ROOM_IN_USE", message: rawMessage.replace("ROOM_IN_USE: ", "") };
    }

    return {
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to initialize attendance session. Please try again.",
    };
  }
}

/**
 * Server Action: End an active room attendance session
 */
export async function endHostSession(sessionId: string): Promise<SessionActionResult> {
  try {
    // 1. Enforce server-side role authorization
    const authUser = await requireRole("HOST");

    if (!sessionId || typeof sessionId !== "string") {
      return { success: false, error: "INVALID_INPUT", message: "A valid Session ID is required." };
    }

    // 2. Resolve MySQL user
    const dbUser = await getOrCreateDbUser(
      authUser.userId,
      authUser.email,
      authUser.name,
      authUser.role
    );

    // 3. Find the target session
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        hostUserId: true,
        status: true,
      },
    });

    if (!session) {
      return { success: false, error: "NOT_FOUND", message: "Session not found." };
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return { success: false, error: "INVALID_STATE", message: "This session is not currently active." };
    }

    // 4. Verify session ownership (Host can end their own, Admins can end any)
    const isOwner = session.hostUserId === dbUser.id;
    const isElevatedAdmin = authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";

    if (!isOwner && !isElevatedAdmin) {
      return { success: false, error: "UNAUTHORIZED", message: "You are not authorized to terminate this session." };
    }

    // 5. Update session status to ENDED with server timestamp
    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.ENDED,
        endsAt: new Date(),
      },
    });

    // 6. Revalidate cache paths
    revalidatePath("/host");
    revalidatePath("/admin");
    revalidatePath("/admin/sessions");

    return { success: true };
  } catch (error) {
    console.error("Error ending host session:", error);
    return {
      success: false,
      error: "SERVER_ERROR",
      message: "Failed to terminate session. Please try again.",
    };
  }
}
