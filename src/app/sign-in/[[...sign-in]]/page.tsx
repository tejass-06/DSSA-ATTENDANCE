import { SignIn } from "@clerk/nextjs";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Shield } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#030712] text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar />

      <main className="flex-1 dssa-grid-bg relative flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Glow effects */}
        <div className="pointer-events-none absolute inset-0 dssa-radial-glow opacity-60" />
        <div className="pointer-events-none absolute top-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative w-full max-w-md space-y-6 flex flex-col items-center">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-400 font-mono">
              <Shield className="h-3.5 w-3.5" />
              <span>DSSA SECURE AUTHENTICATION</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Sign in to DSSA Attendance
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Authenticate with your verified DSSA member account.
            </p>
          </div>

          {/* Clerk SignIn Component */}
          <div className="w-full flex justify-center">
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/dashboard"
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
