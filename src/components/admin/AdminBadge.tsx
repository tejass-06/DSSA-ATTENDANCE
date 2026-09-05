import React from "react";

type BadgeType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "HOST"
  | "MEMBER"
  | "PENDING"
  | "SCHEDULED"
  | "ACTIVE"
  | "ENDED"
  | "CANCELLED"
  | "PRESENT"
  | "REJECTED"
  | "REVOKED"
  | "ACTIVE_ROOM"
  | "INACTIVE_ROOM";

interface AdminBadgeProps {
  type: BadgeType | string;
  label?: string;
  className?: string;
}

export function AdminBadge({ type, label, className = "" }: AdminBadgeProps) {
  const displayLabel = label || type;

  let styles = "bg-zinc-800/80 text-zinc-300 border-zinc-700/60";

  switch (type) {
    case "SUPER_ADMIN":
      styles = "bg-purple-950/40 text-purple-300 border-purple-500/30";
      break;
    case "ADMIN":
      styles = "bg-blue-950/40 text-blue-300 border-blue-500/30";
      break;
    case "HOST":
      styles = "bg-amber-950/40 text-amber-300 border-amber-500/30";
      break;
    case "MEMBER":
      styles = "bg-cyan-950/40 text-cyan-300 border-cyan-500/30";
      break;
    case "PENDING":
      styles = "bg-zinc-900 text-zinc-400 border-zinc-700/40";
      break;
    case "ACTIVE":
    case "ACTIVE_ROOM":
    case "PRESENT":
      styles = "bg-emerald-950/40 text-emerald-300 border-emerald-500/30";
      break;
    case "SCHEDULED":
      styles = "bg-sky-950/40 text-sky-300 border-sky-500/30";
      break;
    case "ENDED":
    case "INACTIVE_ROOM":
      styles = "bg-zinc-900 text-zinc-400 border-zinc-700/50";
      break;
    case "CANCELLED":
    case "REJECTED":
    case "REVOKED":
      styles = "bg-rose-950/40 text-rose-300 border-rose-500/30";
      break;
    default:
      styles = "bg-zinc-800/80 text-zinc-300 border-zinc-700/60";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${styles} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {displayLabel}
    </span>
  );
}
