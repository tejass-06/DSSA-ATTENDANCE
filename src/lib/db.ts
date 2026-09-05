/**
 * DSSA Room Attendance System
 * Prisma Client Singleton — Phase 4
 *
 * Uses global caching in development so Next.js hot-reloads
 * don't exhaust MySQL connection limits.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
