import { currentUser, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import {
  ShieldCheck,
  User,
  Mail,
  Key,
  LogOut,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || user?.username || "DSSA Member";

  const primaryEmail =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress ||
    "No email registered";

  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative py-10 px-4 sm:px-6 lg:px-8">
        {/* Glow ambient */}
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-60" />
        <div className="pointer-events-none absolute top-10 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl space-y-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400 font-mono mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>AUTHENTICATED SESSION</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                DSSA ATTENDANCE
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Welcome, <span className="font-semibold text-emerald-300">{fullName}</span>. You are signed in successfully.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-10 w-10 ring-2 ring-emerald-500/30",
                  },
                }}
              />
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-950/20 hover:bg-red-950/40 text-red-400 px-3.5 py-2 text-xs font-mono font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>SIGN OUT</span>
                </button>
              </SignOutButton>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="dssa-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
                <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-300">
                  VERIFIED CLERK IDENTITY (SERVER-RETRIEVED)
                </h2>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={fullName}
                  width={72}
                  height={72}
                  className="rounded-2xl border border-emerald-500/30 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <User className="h-8 w-8" />
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">{fullName}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    {primaryEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Authentication Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Key className="h-3.5 w-3.5 text-cyan-400" />
                  <span>CLERK USER ID</span>
                </div>
                <p className="font-mono text-xs text-zinc-200 truncate">{user?.id}</p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-4">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  <span>SESSION VERIFIED AT</span>
                </div>
                <p className="font-mono text-xs text-zinc-200">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (Server Timestamp)
                </p>
              </div>
            </div>
          </div>

          {/* Phase 2 Authentication Verification Notice */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-zinc-300">
                <p className="font-semibold text-white">
                  Phase 2 Authentication Verification Passed
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  Clerk authentication is fully operational. Server components safely retrieve authenticated user credentials without trusting client inputs.
                  Subsequent features (User Roles, Database, Sessions, Geofencing) will be implemented in upcoming phases.
                </p>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              &larr; Return to Landing Page
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Manage account via:</span>
              <UserButton />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
