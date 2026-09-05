/**
 * DSSA Room Attendance System
 * Attendance Submission Route Handler
 * POST /api/attendance/submit
 * Phase 10: Member QR Scanning + Attendance Submission
 */
import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/server";
import { processAttendanceSubmission } from "@/lib/attendance/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserWithRole();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
          errorCode: "UNAUTHENTICATED",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Malformed request payload.",
          errorCode: "MALFORMED_JSON",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Accepts either { payload: "..." } or raw object
    const rawPayload =
      body && typeof body === "object" && "payload" in body
        ? (body as { payload: unknown }).payload
        : body;

    const result = await processAttendanceSubmission(user, rawPayload);

    const status = result.success
      ? 200
      : result.errorCode === "UNAUTHENTICATED"
      ? 401
      : result.errorCode === "UNAUTHORIZED_ROLE"
      ? 403
      : 400;

    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again.",
        errorCode: "SERVER_ERROR",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
