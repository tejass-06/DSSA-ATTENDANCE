import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "DSSA | Room Attendance System",
  description:
    "Official Room-Based Attendance Management System for Data Science Students' Association (DSSA), SCET Nagpur. Featuring secure cryptographic rotating QR, room geofencing, and multi-layered presence verification.",
  keywords: [
    "DSSA",
    "Data Science Students Association",
    "Attendance System",
    "SCET Nagpur",
    "Room Attendance",
    "Geofenced Attendance",
  ],
  authors: [{ name: "DSSA Technical Team" }],
  openGraph: {
    title: "DSSA Room Attendance System",
    description: "Official room-based attendance management with multi-layered verification for DSSA.",
    type: "website",
    locale: "en_US",
    siteName: "DSSA Attendance",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#10b981",
          colorBackground: "#0b0f19",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "dssa-card border border-white/10 shadow-2xl",
          formButtonPrimary:
            "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-semibold shadow-lg shadow-emerald-950/30",
          footerActionLink: "text-emerald-400 hover:text-emerald-300",
        },
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} ${jetbrainsMono.variable} dark h-full bg-[#030712] text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300`}
      >
        <body className="min-h-full flex flex-col font-sans bg-[#030712] text-slate-100 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
