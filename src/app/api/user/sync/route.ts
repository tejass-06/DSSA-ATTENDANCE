/**
 * DSSA Room Attendance System
 * POST /api/user/sync — Sync authenticated Clerk user into MySQL
 * Phase 5: Updated to use Prisma AppRole enum
 *
 * Role source-of-truth: Clerk publicMetadata (server-side).
 * The DB User.role column mirrors Clerk on every sync.
 * No client-supplied role is ever trusted.
 *
 * Security invariants:
 *  - Identity is derived exclusively from the authenticated Clerk session.
 *  - clerkId is never accepted from the request body.
 *  - role is never accepted from the request body.
 *  - An existing elevated role (ADMIN, HOST, etc.) is always overwritten
 *    from Clerk publicMetadata — Clerk remains the authority.
 */
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AppRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractRoleFromMetadata } from "@/lib/auth/roles";

export async function POST() {
  // 1. Require an authenticated Clerk session
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch the full Clerk user object (includes publicMetadata)
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 3. Extract canonical role from Clerk publicMetadata — server-side only.
  //    extractRoleFromMetadata returns the AppRole string; cast to Prisma enum.
  const roleString = extractRoleFromMetadata(clerkUser.publicMetadata);
  const role: AppRole = roleString as AppRole;

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  // 4. Upsert — create on first sign-in, update on every subsequent sign-in.
  //    Role always written from Clerk metadata; client cannot influence it.
  const dbUser = await prisma.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email: primaryEmail,
      name: displayName,
      role,
    },
    update: {
      email: primaryEmail,
      name: displayName,
      role, // mirrors Clerk publicMetadata; Clerk remains authoritative
    },
    select: { id: true, role: true, email: true },
  });

  return NextResponse.json({
    synced: true,
    userId: dbUser.id,
    role: dbUser.role,
  });
}
