# DSSA Room Attendance Management System

Official, production-quality, mobile-first room attendance management system built for the **Data Science Students' Association (DSSA)** at Suryodaya College of Engineering & Technology (SCET), Nagpur.

---

## 🏛️ System Overview

The DSSA Room Attendance System provides controlled, tamper-resistant digital attendance for DSSA meetings, workshops, and committee sessions.

- **Host Mode (Admin Phone):** The administrator uses their smartphone to start sessions, select rooms, generate dynamic rotating QR challenges, and monitor real-time headcount.
- **Member Attendance (Member Phone):** Committee members authenticate on their phones, scan the rotating QR code, grant room geolocation access, and mark verified attendance.
- **Layered Anti-Proxy Security:** Combines Clerk authentication, dynamic rotating QR challenges, server-side room geofencing, database unique constraints, and audit logging to minimize proxy attendance.

---

## 🔐 Authentication (Clerk)

Authentication is powered by **Clerk** using the official `@clerk/nextjs` App Router integration.

### Environment Setup

Create a `.env.local` file in the project root with your Clerk credentials from the [Clerk Dashboard](https://dashboard.clerk.com):

```env
# Clerk API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Route Paths
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

### Route Access Structure
- **Public Routes:** `/` (Landing page), `/sign-in` (Sign in), `/sign-up` (Sign up)
- **Protected Routes:** `/dashboard` (Authenticated member/admin session), and future protected API / attendance routes.

---

## 🛠️ Technology Stack

- **Framework:** Next.js (App Router)
- **Authentication:** Clerk (`@clerk/nextjs`, `@clerk/themes`)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Vanilla CSS Tokens
- **Icons:** Lucide React
- **Design Reference:** [https://dssa.scetngp.com/](https://dssa.scetngp.com/)

---

## 🚀 Development Phases

- [x] **Phase 1: Project Setup & DSSA Design Foundation**
- [x] **Phase 2: Clerk Authentication** *(Completed)*
- [ ] **Phase 3: User Roles & Authorization** *(Next)*
- [ ] **Phase 4: Prisma + MySQL Setup** *(Planned)*
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
