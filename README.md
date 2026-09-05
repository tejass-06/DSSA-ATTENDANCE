# DSSA Room Attendance Management System

Official, production-quality, mobile-first room attendance management system built for the **Data Science Students' Association (DSSA)** at Suryodaya College of Engineering & Technology (SCET), Nagpur.

---

## 🏛️ System Overview

The DSSA Room Attendance System provides controlled, tamper-resistant digital attendance for DSSA meetings, workshops, and committee sessions.

- **Host Mode (Admin/Host Phone):** The host uses their smartphone to select active venues, initiate room attendance sessions, display cryptographic rotating QR challenges, and monitor session telemetry.
- **Member Attendance (Member Phone):** Committee members authenticate on their phones, scan dynamic QR challenges, grant room geolocation access, and mark verified attendance.
- **Layered Anti-Proxy Security:** Combines Clerk authentication, dynamic rotating QR challenges, server-side room geofencing, database unique constraints, and audit logging to minimize proxy attendance.

---

## 🔐 Authentication & Authorization Architecture

### 1. Authentication (Clerk)
User identity and session security are managed via **Clerk** (`@clerk/nextjs` App Router integration with Next.js 16 `proxy.ts`).
- **Public Routes:** `/`, `/sign-in`, `/sign-up`, `/unauthorized`
- **Protected Base Routes:** `/dashboard`, `/admin`, `/host`, `/attendance`

### 2. Authorization (Role-Based Access Control)
The application enforces strict server-side authorization boundaries. A logged-in session does **not** automatically grant elevated permissions.

| Role | Hierarchy | Responsibilities & Access Boundaries |
|---|:---:|---|
| **`SUPER_ADMIN`** | 40 | Full system authority. System settings, administrator management, audit log access, host operations. |
| **`ADMIN`** | 30 | Committee administration. Member management, room coordinates configuration, session overview, host operations. |
| **`HOST`** | 20 | Room session host. Initiating active attendance sessions, managing room state, displaying rotating QR codes. |
| **`MEMBER`** | 10 | Active committee member. Scanning rotating QR challenges and viewing individual attendance records. |
| **`PENDING`** | 0 | **Default for new accounts.** Awaiting administrator verification and role assignment. |

### 3. Server-Side Enforcement Helpers
Located in `src/lib/auth/server.ts`:
- `getCurrentUserWithRole()`: Safely retrieves user context and derives application role from server session.
- `requireRole(minimumRole)`: Verifies role hierarchy server-side; redirects unauthorized users to `/unauthorized`.
- `requireAnyRole([roles])`: Enforces exact role whitelist server-side.

---

## ⚡ Rotating QR Challenge System (Phase 9)

Located in `src/lib/qr/`:
- **Cryptographic Generation:** Node.js `crypto.randomBytes(32)` produces 256-bit cryptographically random nonces.
- **Token Storage Strategy:** Only the SHA-256 digest (`challengeHash`) is persisted in MySQL (`qr_challenges`), preventing database leaks of reusable plaintext tokens.
- **Short-Lived Lifetime:** Tokens have a strict 10-second lifetime (`QR_CHALLENGE_TTL_MS = 10_000`).
- **Session Binding:** Every QR challenge is strictly bound to a single `ACTIVE` `AttendanceSession`. Challenges generated for Session A are rejected for Session B.
- **Host Display:** High-contrast `QRCodeSVG` with animated countdown bar, live rotation status, and fullscreen room presentation mode.
- **Centralized Server Validation:** `validateQRChallenge(sessionId, rawToken)` verifies challenge existence, session status (`ACTIVE`), session binding, and server timestamp expiry.

> [!NOTE]
> Member scanner UI and attendance submission belong to **Phase 10**. GPS geofencing belongs to **Phases 11–12**, and realtime streaming belongs to **Phase 15**.

---

## 🔄 Attendance Session Management (Phase 8)

### Session Lifecycle State Machine
Located in `src/lib/session/lifecycle.ts`:
- `SCHEDULED` &rarr; `ACTIVE` (Host initiates session)
- `ACTIVE` &rarr; `ENDED` (Host or Admin concludes session)
- `SCHEDULED` &rarr; `CANCELLED` (Host or Admin cancels scheduled session)
- `ACTIVE` &rarr; `CANCELLED` (Host or Admin aborts active session)
- Illegal transitions (e.g. `ENDED` &rarr; `ACTIVE`, `CANCELLED` &rarr; `ENDED`) are rejected server-side.

### Session Routes
- **`/host`**: Live session operational console (starts new session or displays currently active session with live rotating QR).
- **`/host/sessions`**: Historical session registry of sessions created by the authenticated host.
- **`/host/sessions/[id]`**: Dedicated operational session report with strict ownership authorization and QR broadcast.
- **`/admin/sessions`**: System-wide session operations log with server-validated status filtering (`ALL`, `ACTIVE`, `ENDED`, `SCHEDULED`, `CANCELLED`).

---

## 📱 Host Mode (Phase 7, 8, 9)

Located at `/host` and accessible by `HOST`, `ADMIN`, and `SUPER_ADMIN`.

---

## 📊 Admin Dashboard Foundation (Phase 6)

The Administrative Control Center is located at `/admin` and strictly requires `ADMIN` or `SUPER_ADMIN` authorization.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Authentication:** Clerk (`@clerk/nextjs`, `@clerk/themes`)
- **Database & ORM:** MySQL + Prisma 6.19.3
- **QR Generation:** `qrcode.react` (SVG)
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
- [x] **Phase 9: Rotating QR Attendance System** *(Completed)*
- [ ] **Phase 10: Member QR Scanning + Attendance Submission** *(Next)*
- [ ] **Phase 11: Geolocation Verification** *(Planned)*
- [ ] **Phase 12: Geofencing** *(Planned)*
- [ ] **Phase 13: Duplicate Protection & Server Validation** *(Planned)*
- [ ] **Phase 14: Anti-Proxy Hardening** *(Planned)*
- [ ] **Phase 15: Live Attendance** *(Planned)*
- [ ] **Phase 16: Attendance History** *(Planned)*
- [ ] **Phase 17: CSV Export** *(Planned)*
- [ ] **Phase 18: Room Management** *(Planned)*
- [ ] **Phase 19: Profile & Settings** *(Planned)*
- [ ] **Phase 20: Responsive / PWA Improvements** *(Planned)*
- [ ] **Phase 21: Security Testing** *(Planned)*
- [ ] **Phase 22: Performance Optimization** *(Planned)*
- [ ] **Phase 23: Production Deployment** *(Planned)*
- [ ] **Phase 24: Optional MySQL → PostgreSQL Migration** *(Planned)*

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run TypeScript check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Build production bundle
npm run build
```
