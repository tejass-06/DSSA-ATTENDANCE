/**
 * DSSA Room Attendance System
 * GET /api/health — Database connectivity health check
 * Phase 4: Prisma + MySQL Foundation
 * Phase 6: Sanitized error reporting (no database leaks in production)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const start = Date.now();

  try {
    // Lightweight connectivity probe — does not read/write sensitive data
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      database: "connected",
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Sanitize error message in production
    const isDev = process.env.NODE_ENV !== "production";
    const errorMessage = isDev
      ? error instanceof Error
        ? error.message
        : "Unknown database error"
      : "Database service unavailable";

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
