/**
 * DSSA Room Attendance System
 * Attendance Submission Route Handler
 * POST /api/attendance/submit
 * Phase 11: Geolocation Capture + Location Validation
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

    // Parse payload, location, and optional context from body
    let rawPayload: unknown = body;
    let locationInput: unknown = undefined;
    let clientContextInput: unknown = undefined;

    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      if ("payload" in obj) {
        rawPayload = obj.payload;
      }
      if ("location" in obj) {
        locationInput = obj.location;
      } else if ("coords" in obj) {
        locationInput = obj.coords;
      } else if ("latitude" in obj && "longitude" in obj) {
        locationInput = {
          latitude: obj.latitude,
          longitude: obj.longitude,
          accuracy: obj.accuracy,
        };
      }
      if ("context" in obj) {
        clientContextInput = obj.context;
      }
    }

    const result = await processAttendanceSubmission(user, rawPayload, locationInput, clientContextInput);

    const status = result.success
      ? 200
      : result.errorCode === "UNAUTHENTICATED"
      ? 401
      : result.errorCode === "UNAUTHORIZED_ROLE"
      ? 403
      : result.errorCode === "RATE_LIMITED"
      ? 429
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
