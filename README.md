# DSSA Room Attendance Management System

Official, production-quality, mobile-first room attendance management system built for the **Data Science Students' Association (DSSA)** at Suryodaya College of Engineering & Technology (SCET), Nagpur.

---

## 🏛️ System Overview

The DSSA Room Attendance System provides controlled, tamper-resistant digital attendance for DSSA meetings, workshops, and committee sessions.

- **Host Mode (Admin/Host Phone):** The host uses their smartphone to select active venues, initiate room attendance sessions, display cryptographic rotating QR challenges, and monitor live attendance telemetry in real time.
- **Member Attendance (Member Phone):** Committee members authenticate on their phones, scan dynamic QR challenges with their device camera, grant device geolocation access, and submit cryptographic tokens and coordinates for server-side verification.
- **Layered Anti-Proxy Security:** Combines Clerk authentication, dynamic rotating QR challenges (10s TTL + 2s grace), server-side room geofence enforcement against database room radius boundaries, database unique constraints `@@unique([sessionId, userId])`, server timestamps, sliding-window rate limiting, and immutable audit logging.

---

## 🔐 Authentication & Authorization Architecture

### 1. Authentication (Clerk)
User identity and session security are managed via **Clerk** (`@clerk/nextjs` App Router integration with Next.js 16 `proxy.ts`).
- **Public Routes:** `/`, `/sign-in`, `/sign-up`, `/unauthorized`
- **Protected Base Routes:** `/dashboard`, `/admin`, `/host`, `/attendance`, `/profile`, `/settings`

### 2. Authorization (Role-Based Access Control)
The application enforces strict server-side authorization boundaries. **MySQL `User.role` is the single authoritative source of truth for application authorization.** A logged-in session or client metadata does **not** grant permissions without explicit database authorization.

| Role | Hierarchy | Responsibilities & Access Boundaries |
|---|:---:|---|
| **`SUPER_ADMIN`** | 40 | Full system authority. System settings, administrator management, audit logs, room management, CSV exports. |
| **`ADMIN`** | 30 | Committee administration. Attendance ledger, analytics, room coordinates configuration, session logs, host operations. |
| **`HOST`** | 20 | Room session host. Initiating active attendance sessions, managing room state, displaying rotating QR codes, monitoring live session channels. |
| **`MEMBER`** | 10 | Active committee member. Scanning rotating QR challenges, submitting verified geolocation, and viewing personal attendance history. |
| **`PENDING`** | 0 | **Default for new accounts.** Awaiting administrator verification and role assignment. Blocked from attendance submission. |

### 3. Server-Side Enforcement Helpers
Located in `src/lib/auth/server.ts`:
- `getCurrentUserWithRole()`: Safely retrieves user context and derives authoritative role from MySQL `User.role`.
- `requireRole(minimumRole)`: Verifies role hierarchy server-side; redirects unauthorized users to `/unauthorized`.
- `requireAnyRole([roles])`: Enforces exact role whitelist server-side.

---

## ⚡ Realtime Live Attendance System (Phase 15)

Located in `src/lib/realtime/`, `src/hooks/useLiveAttendance.ts`, `src/components/host/LiveAttendanceFeed.tsx`, and `src/app/api/realtime/auth/route.ts`:

- **Architectural Separation:**
  - **Database Authority:** MySQL + Prisma (`AttendanceRecord`) is the sole source of truth. Realtime is an event delivery layer.
  - **Server Transaction Guarantee:** Realtime events (`attendance:recorded`) are published **only after** the database transaction successfully commits `AttendanceRecord` and `AuditLog`.
  - **Failure Isolation:** If realtime delivery or network connectivity fails, attendance creation remains 100% valid. The host UI automatically reconciles against the database snapshot via manual or automatic sync.
- **Vercel / Serverless-Compatible Pub/Sub:**
  - Uses managed WebSocket infrastructure (`pusher` on server via REST API + `pusher-js` on client) compatible with stateless serverless execution.
  - Graceful development/test fallback mode when environment credentials are not present.
- **Private Channel Authorization (`POST /api/realtime/auth`):**
  - Subscriptions are strictly isolated by session (`private-session-<sessionId>`).
  - **HOST:** Authorized only if they own the specific session (`session.hostUserId === user.id`).
  - **ADMIN / SUPER_ADMIN:** Authorized to monitor sessions system-wide.
  - **MEMBER / PENDING:** Strictly rejected (HTTP 403) from subscribing to privileged host/admin channels.
- **Live Host Experience:**
  - Integrated into Host Mode (`/host` & `/host/sessions/[id]`) with live connection state badges (`LIVE`, `RECONNECTING`, `SYNCED`), deduplicated attendee list, and real-time headcount counter.
- **Zero-Trust Privacy & Idempotency:**
  - Events contain only sanitized display fields (`attendanceId`, `sessionId`, `attendeeName`, `status`, `markedAt`).
  - Zero raw tokens, zero hashes, and zero GPS coordinates are transmitted over realtime channels.
  - Client state uses unique key tracking (`seenIdsRef`) to guarantee zero duplicate rows or counter inflation on duplicate event delivery.

---

## 📈 Attendance & Admin Management (Phase 16)

Located in `src/app/admin/`, `src/app/attendance/history/`, and `src/lib/csv/`:

- **Attendance History Ledger (`/admin/attendance`)**: Server-side filtered and paginated (20 per page) ledger by status, date range, room, session, and member search.
- **Attendance Detail View (`/admin/attendance/[id]`)**: Detailed verification provenance, member identity, venue boundaries, and timestamp auditing.
- **Member Personal Attendance History (`/attendance/history`)**: Authoritatively scoped to authenticated user (`where: { userId: dbUser.id }`).
- **Secure Server-Side CSV Export (`GET /api/admin/attendance/export`)**: Restricted to `ADMIN`/`SUPER_ADMIN`, RFC 4180 compliant, Spreadsheet Formula Injection (DDE) protected (`=`, `+`, `-`, `@`, `\t` escaped), 5,000 max row limit, with immutable audit logging.
- **Attendance Analytics (`/admin/analytics`)**: Server-side database aggregations for total attendance, verification success rate, present/rejected breakdown, and session performance.
- **Room Registry & Management (`/admin/rooms`)**: Room creation, coordinate updates, geofence radius bounds enforcement ($5\text{m} \le \text{radius} \le 500\text{m}$), and **Active Session Room Protection** (preventing coordinate changes or deactivation while an attendance session is active).
- **Profile & Settings (`/profile`, `/settings`)**: Displays authoritative MySQL `User.role` badge and system operational policies.

---

## 🛡️ Advanced Anti-Proxy Hardening (Phase 14)

Located in `src/lib/security/`, `src/lib/attendance/service.ts`, and `src/app/api/dev/anti-proxy-test/route.ts`:

- **Layered Threat Mitigation Model:**
  - **QR & Screenshot Sharing:** Mitigated by 10s rotation TTL (2s transport grace) + server session binding + geofence verification.
  - **Remote Proxy Scanning:** Rejected by server-side Haversine geofence calculation against authoritative database room venue.
  - **Automated Hammering & Brute Force:** Sliding-window rate limiting (5 requests / 10s burst; 20 requests / 60s sustained).
  - **Client Spoofing Claims:** Client-submitted `trustedDevice`, `riskScore`, fake context IDs, fake room IDs, or fake coordinates are strictly ignored.
- **Privacy-Conscious Design:**
  - **NO Invasive Device Fingerprinting:** Strictly avoids Canvas, WebGL, font fingerprinting, hardware identifiers, MAC addresses, or IMEI numbers.
  - **Privacy-Preserving Audit Logging:** Security audit events store only sanitized metadata—never raw coordinates or cryptographic tokens.

---

## 🛡️ Duplicate Protection & Server Validation Hardening (Phase 13)

- **Atomic Database Transaction & Concurrency Defense:**
  - Immediate pre-commit validation in `prisma.$transaction`: verifies session is `ACTIVE`, room is `isActive`, user is authorized, and geofence passes.
  - Database unique constraint: `@@unique([sessionId, userId])`.
  - Concurrent submissions resolve safely without race conditions.

---

## 🌐 Room Geofencing & Boundary Enforcement (Phase 12)

- **Authoritative Database Source:** Geofence radius is derived exclusively from `Room.radiusMeters` in MySQL.
- **Radius Bounds:** `MIN_ROOM_RADIUS_METERS = 5` and `MAX_ROOM_RADIUS_METERS = 500`.
- **Accuracy-Aware Boundary Policy:**
  - **`INSIDE` (`distance + accuracy <= radius`):** Member is comfortably inside the geofence; attendance proceeds.
  - **`OUTSIDE` (`distance - accuracy > radius`):** Member is outside the geofence; attendance is rejected (`LOCATION_OUTSIDE`).
  - **`UNCERTAIN` (uncertainty overlaps boundary):** Conservative policy fails closed (`LOCATION_UNCERTAIN`).

---

## 📍 Geolocation Capture & Server Distance Validation (Phase 11)

- **Browser GPS Capture:** Point-in-time acquisition via `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true` upon successful QR code detection.
- **Coordinate Bounds Validation:** `-90 <= latitude <= 90`, `-180 <= longitude <= 180`, max accuracy threshold $100\text{m}$.
- **Numerically Safe Haversine Utility (`src/lib/geo/distance.ts`)**: Great-circle distance calculation.

---

## 📷 Member QR Scanning & Attendance Submission (Phase 10)

- **Member Camera Scanner:** Built with pure JavaScript `jsQR` Canvas video processing, camera permission handling, and stream cleanup.
- **Authoritative Server Submission:** Validates Clerk identity, MySQL role, protocol version (`DSSA_ATT_V1`), rotating challenge nonce hash, and creates `AttendanceRecord`.

---

## ⚡ Rotating QR Challenge System (Phase 9)

- **Cryptographic Generation:** Node.js `crypto.randomBytes(32)` produces 256-bit cryptographically random nonces.
- **Token Storage Strategy:** Only the SHA-256 digest (`challengeHash`) is persisted in MySQL (`qr_challenges`).
- **Short-Lived Lifetime:** Tokens have a strict 10-second base lifetime (`QR_CHALLENGE_TTL_MS = 10_000`) with 2-second transport grace period (`QR_GRACE_PERIOD_MS = 2_000`).

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Authentication:** Clerk (`@clerk/nextjs`, `@clerk/themes`)
- **Database & ORM:** MySQL + Prisma 6.19.3
- **Realtime:** Pusher Serverless WebSockets
- **QR Generation & Decoding:** `qrcode.react` (SVG) + `jsqr` (Canvas decoder)
- **Geolocation & Geofencing:** Numerically-safe Haversine math & accuracy-aware boundary engine
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + Vanilla CSS Design Tokens
- **Icons:** Lucide React
- **Design Reference:** [https://dssa.scetngp.com/](https://dssa.scetngp.com/)

---

## 🚀 Development Phases

- [x] **Phase 1: Project Setup & DSSA Design Foundation**
- [x] **Phase 2: Clerk Authentication**
- [x] **Phase 3: User Roles & Authorization**
- [x] **Phase 4: Prisma + MySQL Database Foundation**
- [x] **Phase 5: Database Models & Relationships**
- [x] **Phase 6: Admin Dashboard Foundation**
- [x] **Phase 7: Host Mode Foundation**
- [x] **Phase 8: Attendance Session Management**
- [x] **Phase 9: Rotating QR Attendance System**
- [x] **Phase 10: Member QR Scanning + Attendance Submission**
- [x] **Phase 11: Geolocation Capture + Location Validation**
- [x] **Phase 12: Room Geofencing + Attendance Boundary Enforcement**
- [x] **Phase 13: Duplicate Protection + Server Validation Hardening**
- [x] **Phase 14: Advanced Anti-Proxy Hardening**
- [x] **Phase 15: Realtime Live Attendance**
- [x] **Phase 16: Attendance & Admin Management**
- [x] **Phase 17: Final Security + Performance QA**

---

## 💻 Local Development & Quality Gates

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Build production bundle
npm run build
```
