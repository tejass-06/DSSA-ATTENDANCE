/**
 * DSSA Room Attendance System — Route Protection (proxy.ts)
 * Next.js 16 App Router Proxy / Middleware
 * Clerk authentication protects dashboard, admin, host, attendance, profile, settings routes.
 * Dev testing routes (/api/dev/*) are strictly locked in production.
 */
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/host(.*)",
  "/attendance(.*)",
  "/profile(.*)",
  "/settings(.*)",
]);

const isDevApiRoute = createRouteMatcher(["/api/dev(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Block development test endpoints in production environments
  if (process.env.NODE_ENV === "production" && isDevApiRoute(req)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
