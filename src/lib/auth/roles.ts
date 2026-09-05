/**
 * DSSA Room Attendance System - Canonical Role & Authorization Definitions
 * Phase 3: User Roles & Server-Side Authorization
 */

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "HOST" | "MEMBER" | "PENDING";

export const APP_ROLES: readonly AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "HOST",
  "MEMBER",
  "PENDING",
] as const;

export const DEFAULT_ROLE: AppRole = "PENDING";

/**
 * Numeric hierarchy values for role escalation checks
 */
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  SUPER_ADMIN: 40,
  ADMIN: 30,
  HOST: 20,
  MEMBER: 10,
  PENDING: 0,
};

export interface RoleMetadata {
  name: AppRole;
  label: string;
  description: string;
  badgeClass: string;
  allowedRoutes: string[];
}

export const ROLE_METADATA_CONFIG: Record<AppRole, RoleMetadata> = {
  SUPER_ADMIN: {
    name: "SUPER_ADMIN",
    label: "Super Administrator",
    description: "Full system authority. Manages admins, rooms, system configurations, and audit logs.",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    allowedRoutes: ["/dashboard", "/admin", "/host", "/attendance", "/profile"],
  },
  ADMIN: {
    name: "ADMIN",
    label: "Administrator",
    description: "Committee administration. Manages members, rooms, sessions, and attendance reports.",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    allowedRoutes: ["/dashboard", "/admin", "/host", "/attendance", "/profile"],
  },
  HOST: {
    name: "HOST",
    label: "Session Host",
    description: "Meeting host. Starts room sessions, displays dynamic QR codes, and tracks headcount.",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    allowedRoutes: ["/dashboard", "/host", "/attendance", "/profile"],
  },
  MEMBER: {
    name: "MEMBER",
    label: "Committee Member",
    description: "Active DSSA member. Scans attendance QR codes and views own attendance history.",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    allowedRoutes: ["/dashboard", "/attendance", "/profile"],
  },
  PENDING: {
    name: "PENDING",
    label: "Pending Verification",
    description: "Newly authenticated account awaiting administrator role assignment.",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    allowedRoutes: ["/dashboard", "/profile"],
  },
};

/**
 * Validates if an unknown value is a supported AppRole
 */
export function isValidRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

/**
 * Safely parses role from Clerk user publicMetadata or returns DEFAULT_ROLE ("PENDING")
 */
export function extractRoleFromMetadata(metadata: unknown): AppRole {
  if (
    metadata &&
    typeof metadata === "object" &&
    "role" in metadata &&
    isValidRole((metadata as Record<string, unknown>).role)
  ) {
    return (metadata as Record<string, unknown>).role as AppRole;
  }
  return DEFAULT_ROLE;
}

/**
 * Checks if a user's role satisfies minimum hierarchy requirement
 */
export function hasMinimumRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Checks if a user's role is in the list of explicitly permitted roles
 */
export function hasAnyRole(userRole: AppRole, allowedRoles: AppRole[]): boolean {
  return allowedRoles.includes(userRole);
}
