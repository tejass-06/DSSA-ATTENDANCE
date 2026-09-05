import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  type AppRole,
  extractRoleFromMetadata,
  hasMinimumRole,
  hasAnyRole,
} from "./roles";

export interface AuthenticatedUserContext {
  userId: string;
  role: AppRole;
  email: string;
  name: string;
  imageUrl?: string;
}

/**
 * Retrieves authenticated Clerk user and derives authorized application role server-side.
 * Never trusts client-supplied inputs.
 */
export async function getCurrentUserWithRole(): Promise<AuthenticatedUserContext | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  const role = extractRoleFromMetadata(user.publicMetadata);

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    "No email registered";

  const fullName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.username || "DSSA Member";

  return {
    userId: user.id,
    role,
    email: primaryEmail,
    name: fullName,
    imageUrl: user.imageUrl,
  };
}

/**
 * Asserts that the current request is authenticated.
 * Redirects to /sign-in if unauthenticated.
 */
export async function requireAuth(): Promise<AuthenticatedUserContext> {
  const userContext = await getCurrentUserWithRole();

  if (!userContext) {
    redirect("/sign-in");
  }

  return userContext;
}

/**
 * Asserts that the current user possesses at least the minimum specified role.
 * Redirects to /unauthorized if authorization fails.
 */
export async function requireRole(minimumRole: AppRole): Promise<AuthenticatedUserContext> {
  const userContext = await requireAuth();

  if (!hasMinimumRole(userContext.role, minimumRole)) {
    redirect(`/unauthorized?required=${minimumRole}&current=${userContext.role}`);
  }

  return userContext;
}

/**
 * Asserts that the current user belongs to one of the explicitly permitted roles.
 * Redirects to /unauthorized if authorization fails.
 */
export async function requireAnyRole(allowedRoles: AppRole[]): Promise<AuthenticatedUserContext> {
  const userContext = await requireAuth();

  if (!hasAnyRole(userContext.role, allowedRoles)) {
    redirect(`/unauthorized?required=${allowedRoles.join(",")}&current=${userContext.role}`);
  }

  return userContext;
}

/**
 * Convenience role verification checks
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUserWithRole();
  return user ? user.role === "SUPER_ADMIN" : false;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUserWithRole();
  return user ? hasMinimumRole(user.role, "ADMIN") : false;
}

export async function isHost(): Promise<boolean> {
  const user = await getCurrentUserWithRole();
  return user ? hasMinimumRole(user.role, "HOST") : false;
}

export async function isMember(): Promise<boolean> {
  const user = await getCurrentUserWithRole();
  return user ? hasMinimumRole(user.role, "MEMBER") : false;
}
