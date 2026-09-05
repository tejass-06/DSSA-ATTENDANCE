# DSSA Room Attendance Management System

Official, production-quality, mobile-first room attendance management system built for the **Data Science Students' Association (DSSA)** at Suryodaya College of Engineering & Technology (SCET), Nagpur.

---

## 🏛️ System Overview

The DSSA Room Attendance System provides controlled, tamper-resistant digital attendance for DSSA meetings, workshops, and committee sessions.

- **Host Mode (Admin/Host Phone):** The host uses their smartphone to select active venues, initiate room attendance sessions, monitor operational telemetry, and inspect historical session reports.
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
| **`HOST`** | 20 | Room session host. Initiating active attendance sessions, managing room state, concluding sessions, session history. |
| **`MEMBER`** | 10 | Active committee member. Scanning rotating QR challenges and viewing individual attendance records. |
| **`PENDING`** | 0 | **Default for new accounts.** Awaiting administrator verification and role assignment. |

### 3. Server-Side Enforcement Helpers
Located in `src/lib/auth/server.ts`:
- `getCurrentUserWithRole()`: Safely retrieves user context and derives application role from server session.
- `requireRole(minimumRole)`: Verifies role hierarchy server-side; redirects unauthorized users to `/unauthorized`.
- `requireAnyRole([roles])`: Enforces exact role whitelist server-side.

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
- **`/host`**: Live session operational console (starts new session or displays currently active session).
- **`/host/sessions`**: Historical session registry of sessions created by the authenticated host.
- **`/host/sessions/[id]`**: Dedicated operational session report with strict ownership authorization.
- **`/admin/sessions`**: System-wide session operations log with server-validated status filtering (`ALL`, `ACTIVE`, `ENDED`, `SCHEDULED`, `CANCELLED`).

---

## 📱 Host Mode (Phase 7 & 8)

Located at `/host` and accessible by `HOST`, `ADMIN`, and `SUPER_ADMIN`.

### Features & Capabilities
1. **Host Identity & Authorization:** Server-verified operator profile derived from Clerk session and synced with MySQL `users`.
2. **Room Selection:** Real active venues queried from MySQL with touch-friendly selection cards, geofence radius display, and conflict indicators.
3. **Session State Detection & Persistence:** Automatically detects existing `ACTIVE` sessions from MySQL on initial load and page refreshes.
4. **Transactional Session Initiation:** Starts attendance sessions with Prisma transaction safety, preventing duplicate active sessions per host and per room.
5. **Session Lifecycle Management:** Hosts can conclude active sessions with server-side validation and timestamp recording (`endsAt`).
6. **QR Channel Placeholder:** Presentation-ready broadcast area reserved for Phase 9 dynamic QR rotation.

---

## 📊 Admin Dashboard Foundation (Phase 6)

The Administrative Control Center is located at `/admin` and strictly requires `ADMIN` or `SUPER_ADMIN` authorization.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Authentication:** Clerk (`@clerk/nextjs`, `@clerk/themes`)
- **Database & ORM:** MySQL + Prisma 6.19.3
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
- [x] **Phase 8: Attendance Session Management** *(Completed)*
- [ ] **Phase 9: Rotating QR System** *(Next)*
- [ ] **Phase 10: Member Attendance Flow** *(Planned)*
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
