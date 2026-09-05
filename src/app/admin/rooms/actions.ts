"use server";

/**
 * DSSA Room Attendance System
 * Admin Room Management Server Actions
 * Phase 16: Attendance & Admin Management
 */

import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/server";
import { hasMinimumRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import {
  MIN_ROOM_RADIUS_METERS,
  MAX_ROOM_RADIUS_METERS,
} from "@/lib/geo/config";

export interface CreateRoomInput {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface UpdateRoomInput {
  name?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  isActive?: boolean;
}

export interface RoomActionResult {
  success: boolean;
  error?: string;
  roomId?: string;
}

/**
 * Validates coordinate numbers and geofence radius bounds.
 */
function validateRoomFields(
  latitude?: number,
  longitude?: number,
  radiusMeters?: number
): string | null {
  if (latitude !== undefined) {
    if (typeof latitude !== "number" || isNaN(latitude) || !isFinite(latitude)) {
      return "INVALID_COORDINATES: Latitude must be a valid finite number.";
    }
    if (latitude < -90 || latitude > 90) {
      return "INVALID_COORDINATES: Latitude must be between -90 and 90 degrees.";
    }
  }

  if (longitude !== undefined) {
    if (typeof longitude !== "number" || isNaN(longitude) || !isFinite(longitude)) {
      return "INVALID_COORDINATES: Longitude must be a valid finite number.";
    }
    if (longitude < -180 || longitude > 180) {
      return "INVALID_COORDINATES: Longitude must be between -180 and 180 degrees.";
    }
  }

  if (radiusMeters !== undefined) {
    if (
      typeof radiusMeters !== "number" ||
      isNaN(radiusMeters) ||
      !isFinite(radiusMeters) ||
      !Number.isInteger(radiusMeters)
    ) {
      return "INVALID_RADIUS: Radius must be a valid integer.";
    }
    if (
      radiusMeters < MIN_ROOM_RADIUS_METERS ||
      radiusMeters > MAX_ROOM_RADIUS_METERS
    ) {
      return `INVALID_RADIUS: Geofence radius must be between ${MIN_ROOM_RADIUS_METERS}m and ${MAX_ROOM_RADIUS_METERS}m.`;
    }
  }

  return null;
}

/**
 * Server Action: Create Room
 */
export async function createRoomAction(
  input: CreateRoomInput
): Promise<RoomActionResult> {
  try {
    const user = await getCurrentUserWithRole();
    if (!user || !hasMinimumRole(user.role, "ADMIN")) {
      return { success: false, error: "FORBIDDEN: Admin privileges required." };
    }

    const trimmedName = input.name?.trim();
    const trimmedCode = input.code?.trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      return {
        success: false,
        error: "INVALID_NAME: Room name must be between 2 and 100 characters.",
      };
    }

    if (!trimmedCode || trimmedCode.length < 2 || trimmedCode.length > 50) {
      return {
        success: false,
        error: "INVALID_CODE: Room code must be between 2 and 50 characters.",
      };
    }

    const validationError = validateRoomFields(
      input.latitude,
      input.longitude,
      input.radiusMeters
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check unique code
    const existing = await prisma.room.findUnique({
      where: { code: trimmedCode },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: "DUPLICATE_CODE: A room with this code already exists.",
      };
    }

    const room = await prisma.room.create({
      data: {
        name: trimmedName,
        code: trimmedCode,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        isActive: true,
      },
    });

    // Audit log
    const dbActor = await prisma.user.findUnique({
      where: { clerkId: user.userId },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: dbActor?.id || null,
        action: "ROOM_CREATED",
        entityType: "Room",
        entityId: room.id,
        metadata: JSON.stringify({
          name: room.name,
          code: room.code,
          radiusMeters: room.radiusMeters,
        }),
      },
    });

    revalidatePath("/admin/rooms");
    return { success: true, roomId: room.id };
  } catch (error) {
    console.error("[CREATE_ROOM_ERROR]", error);
    return { success: false, error: "Internal server error while creating room." };
  }
}

/**
 * Server Action: Update Room
 */
export async function updateRoomAction(
  roomId: string,
  input: UpdateRoomInput
): Promise<RoomActionResult> {
  try {
    const user = await getCurrentUserWithRole();
    if (!user || !hasMinimumRole(user.role, "ADMIN")) {
      return { success: false, error: "FORBIDDEN: Admin privileges required." };
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return { success: false, error: "NOT_FOUND: Room does not exist." };
    }

    // Active session protection: check if there is an ongoing ACTIVE session in this room
    const activeSession = await prisma.attendanceSession.findFirst({
      where: { roomId, status: "ACTIVE" },
      select: { id: true, title: true },
    });

    // If active session exists, check if coordinates or radius or deactivation is attempted
    const isModifyingBoundary =
      (input.latitude !== undefined &&
        Number(room.latitude) !== Number(input.latitude)) ||
      (input.longitude !== undefined &&
        Number(room.longitude) !== Number(input.longitude)) ||
      (input.radiusMeters !== undefined &&
        room.radiusMeters !== input.radiusMeters);

    const isDeactivating =
      input.isActive !== undefined && input.isActive === false && room.isActive;

    if (activeSession && (isModifyingBoundary || isDeactivating)) {
      return {
        success: false,
        error: `ROOM_ACTIVE_SESSION: Cannot modify boundaries or deactivate room while session "${activeSession.title}" is ACTIVE.`,
      };
    }

    const validationError = validateRoomFields(
      input.latitude,
      input.longitude,
      input.radiusMeters
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.radiusMeters !== undefined
          ? { radiusMeters: input.radiusMeters }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    // Audit log
    const dbActor = await prisma.user.findUnique({
      where: { clerkId: user.userId },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: dbActor?.id || null,
        action: "ROOM_UPDATED",
        entityType: "Room",
        entityId: room.id,
        metadata: JSON.stringify({
          changedFields: Object.keys(input),
          isActive: updatedRoom.isActive,
        }),
      },
    });

    revalidatePath("/admin/rooms");
    return { success: true, roomId: updatedRoom.id };
  } catch (error) {
    console.error("[UPDATE_ROOM_ERROR]", error);
    return { success: false, error: "Internal server error while updating room." };
  }
}

/**
 * Server Action: Toggle Room Active Status
 */
export async function toggleRoomActiveAction(
  roomId: string,
  targetActive: boolean
): Promise<RoomActionResult> {
  return updateRoomAction(roomId, { isActive: targetActive });
}
