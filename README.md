# DSSA Room Attendance Management System

Official, production-quality, mobile-first room attendance management system built for the **Data Science Students' Association (DSSA)** at Suryodaya College of Engineering & Technology (SCET), Nagpur.

---

## 🏛️ System Overview

The DSSA Room Attendance System provides controlled, tamper-resistant digital attendance for DSSA meetings, workshops, and committee sessions.

- **Host Mode (Admin/Host Phone):** The host uses their smartphone to start sessions, select rooms, generate dynamic rotating QR challenges, and monitor real-time headcount.
- **Member Attendance (Member Phone):** Committee members authenticate on their phones, scan the rotating QR code, grant room geolocation access, and mark verified attendance.
- **Layered Anti-Proxy Security:** Combines Clerk authentication, dynamic rotating QR challenges, server-side room geofencing, database unique constraints, and audit logging to minimize proxy attendance.

---

## 🔐 Authentication & Authorization Architecture

### 1. Authentication (Clerk)
User identity and session security are managed via **Clerk** (`@clerk/nextjs` App Router integration).
- **Public Routes:** `/`, `/sign-in`, `/sign-up`, `/unauthorized`
- **Protected Base Routes:** `/dashboard`, `/admin`, `/host`, `/attendance`

### 2. Authorization (Role-Based Access Control)
The application enforces strict server-side authorization boundaries. A logged-in session does **not** automatically grant elevated permissions.

| Role | Hierarchy | Responsibilities & Access Boundaries |
|---|:---:|---|
| **`SUPER_ADMIN`** | 40 | Full system authority. System settings, administrator management, audit log access. |
| **`ADMIN`** | 30 | Committee administration. Member management, room coordinates configuration, session overview, and report exports. |
| **`HOST`** | 20 | Room session host. Starting active attendance sessions, displaying live rotating QR codes, and tracking live headcount. |
| **`MEMBER`** | 10 | Active committee member. Scanning rotating QR challenges and viewing individual attendance records. |
| **`PENDING`** | 0 | **Default for new accounts.** Awaiting administrator verification and role assignment. |

### 3. Role Storage Strategy & Testing
During Phase 3, roles are stored securely in Clerk user `publicMetadata` (`{ "role": "ADMIN" }`).
- **Server-Controlled:** Client code cannot self-assign or escalate roles.
- **Development / Test Role Assignment:**
  1. Open the [Clerk Dashboard](https://dashboard.clerk.com).
  2. Navigate to **Users** &rarr; Select User.
  3. Under **Public Metadata**, set:
     ```json
     {
       "role": "ADMIN"
     }
     ```
     *(Accepted values: `SUPER_ADMIN`, `ADMIN`, `HOST`, `MEMBER`, `PENDING`)*
  4. Save changes. On next page refresh, server components immediately enforce the updated permissions.

### 4. Server-Side Enforcement Helpers
Located in `src/lib/auth/server.ts`:
- `getCurrentUserWithRole()`: Safely retrieves user context and derives application role from server session.
- `requireRole(minimumRole)`: Verifies role hierarchy server-side; redirects unauthorized users to `/unauthorized`.
- `requireAnyRole([roles])`: Enforces exact role whitelist server-side.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Authentication:** Clerk (`@clerk/nextjs`, `@clerk/themes`)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Vanilla CSS Tokens
- **Icons:** Lucide React
- **Design Reference:** [https://dssa.scetngp.com/](https://dssa.scetngp.com/)

---

## 🚀 Development Phases

- [x] **Phase 1: Project Setup & DSSA Design Foundation**
- [x] **Phase 2: Clerk Authentication**
- [x] **Phase 3: User Roles & Authorization** *(Completed)*
- [ ] **Phase 4: Prisma + MySQL Setup** *(Next)*
- [ ] **Phase 5: Database Models & Relationships** *(Planned)*
- [ ] **Phase 6: Admin Dashboard** *(Planned)*
- [ ] **Phase 7: Host Mode** *(Planned)*
- [ ] **Phase 8: Attendance Session Management** *(Planned)*
- [ ] **Phase 9: Rotating QR System** *(Planned)*
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
