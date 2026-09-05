import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-[#02050e] py-8 text-xs text-zinc-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-zinc-300">DSSA Room Attendance Management</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">Official System</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-right">
          <p className="text-zinc-400">
            Data Science Students&apos; Association &bull; Suryodaya College of Engineering &amp; Technology, Nagpur
          </p>
        </div>
      </div>
    </footer>
  );
}
