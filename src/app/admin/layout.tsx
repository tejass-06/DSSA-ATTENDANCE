import React, { ReactNode } from "react";
import { requireRole } from "@/lib/auth/server";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata = {
  title: "DSSA Admin Center | Operational Control",
  description: "Administrative control center for DSSA Room Attendance System",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Strict server-side authorization check — minimum role is ADMIN (allows ADMIN & SUPER_ADMIN)
  const user = await requireRole("ADMIN");

  return (
    <AdminLayoutClient
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </AdminLayoutClient>
  );
}
