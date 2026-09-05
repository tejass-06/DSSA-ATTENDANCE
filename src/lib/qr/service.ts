/**
 * DSSA Room Attendance System
 * QR Cryptographic Service & Centralized Server Validator
 * Phase 9: Rotating QR Attendance System
 */
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { SessionStatus } from "@prisma/client";
import {
  QR_CHALLENGE_TTL_MS,
  QR_GRACE_PERIOD_MS,
  QR_PROTOCOL_PREFIX,
} from "./config";

export interface QRChallengePayload {
  v: string; // Protocol version
  sid: string; // Session ID
  token: string; // Cryptographic nonce
  exp: number; // Expiration epoch ms
}

export interface GeneratedChallengeResult {
  challengeId: string;
  sessionId: string;
  rawToken: string;
  payload: string;
  issuedAt: Date;
  expiresAt: Date;
  ttlMs: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  session?: {
    id: string;
    title: string;
    roomId: string;
    hostUserId: string;
    room: {
      name: string;
      code: string;
      radiusMeters: number;
      latitude: number;
      longitude: number;
    };
    host: {
      name: string | null;
      email: string;
    };
  };
}

/**
 * Generates a 256-bit cryptographically secure random token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes SHA-256 digest of a raw token for safe database persistence
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates and stores a new short-lived rotating QR challenge for an ACTIVE session
 */
export async function generateQRChallenge(sessionId: string): Promise<GeneratedChallengeResult> {
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("INVALID_SESSION_ID: Valid session ID is required.");
  }

  // 1. Verify session exists and is strictly ACTIVE
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND: Attendance session does not exist.");
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw new Error(`SESSION_NOT_ACTIVE: Cannot generate QR for session in ${session.status} status.`);
  }

  // 2. Generate random nonce & compute SHA-256 hash
  const rawToken = generateSecureToken();
  const challengeHash = hashToken(rawToken);

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + QR_CHALLENGE_TTL_MS);

  // 3. Persist hash in MySQL
  const challenge = await prisma.qRChallenge.create({
    data: {
      sessionId: session.id,
      challengeHash,
      issuedAt,
      expiresAt,
    },
    select: {
      id: true,
      sessionId: true,
      issuedAt: true,
      expiresAt: true,
    },
  });

  // 4. Construct compact JSON payload for QR code rendering
  const payloadData: QRChallengePayload = {
    v: QR_PROTOCOL_PREFIX,
    sid: session.id,
    token: rawToken,
    exp: expiresAt.getTime(),
  };

  return {
    challengeId: challenge.id,
    sessionId: challenge.sessionId,
    rawToken,
    payload: JSON.stringify(payloadData),
    issuedAt: challenge.issuedAt,
    expiresAt: challenge.expiresAt,
    ttlMs: QR_CHALLENGE_TTL_MS,
  };
}

/**
 * Centralized Server-Side QR Challenge Validation
 *
 * Verifies:
 *  1. Non-empty sessionId and rawToken
 *  2. Computed SHA-256 challengeHash exists in database
 *  3. Challenge belongs to the specified sessionId
 *  4. Associated session is in ACTIVE status
 *  5. Challenge has not expired (evaluated against current server time + grace period)
 */
export async function validateQRChallenge(
  sessionId: string,
  rawToken: string
): Promise<ValidationResult> {
  if (!sessionId || typeof sessionId !== "string" || !rawToken || typeof rawToken !== "string") {
    return { valid: false, error: "MALFORMED_REQUEST: Session ID and token are required." };
  }

  // Security Hardening: Enforce reasonable limits and hex format for raw token
  if (sessionId.length > 100 || rawToken.length > 256 || rawToken.length < 16) {
    return { valid: false, error: "INVALID_CHALLENGE: Invalid challenge token structure." };
  }

  if (!/^[0-9a-fA-F]+$/.test(rawToken)) {
    return { valid: false, error: "INVALID_CHALLENGE: Challenge token must be hexadecimal." };
  }

  const challengeHash = hashToken(rawToken);

  // Query challenge and eager-load session, room, and host
  const challenge = await prisma.qRChallenge.findUnique({
    where: { challengeHash },
    include: {
      session: {
        include: {
          room: true,
          host: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!challenge) {
    return { valid: false, error: "INVALID_CHALLENGE: Challenge token not recognized." };
  }

  // Verify session binding
  if (challenge.sessionId !== sessionId) {
    return { valid: false, error: "SESSION_MISMATCH: Challenge is not bound to this session." };
  }

  // Verify session is ACTIVE
  if (challenge.session.status !== SessionStatus.ACTIVE) {
    return { valid: false, error: `SESSION_INACTIVE: Session is currently ${challenge.session.status}.` };
  }

  // Server-side expiration check (current server time)
  const now = new Date();
  const maxAllowedTime = new Date(challenge.expiresAt.getTime() + QR_GRACE_PERIOD_MS);

  if (now > maxAllowedTime) {
    return { valid: false, error: "CHALLENGE_EXPIRED: QR challenge token has expired." };
  }

  return {
    valid: true,
    session: {
      id: challenge.session.id,
      title: challenge.session.title,
      roomId: challenge.session.roomId,
      hostUserId: challenge.session.hostUserId,
      room: {
        name: challenge.session.room.name,
        code: challenge.session.room.code,
        radiusMeters: challenge.session.room.radiusMeters,
        latitude: Number(challenge.session.room.latitude),
        longitude: Number(challenge.session.room.longitude),
      },
      host: {
        name: challenge.session.host.name,
        email: challenge.session.host.email,
      },
    },
  };
}
