"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Radio, RefreshCw, AlertCircle, Maximize2, Minimize2, ShieldCheck, Loader2 } from "lucide-react";
import { QR_ROTATION_INTERVAL_MS } from "@/lib/qr/config";

interface ChallengeData {
  challengeId: string;
  payload: string;
  issuedAt: string;
  expiresAt: string;
  ttlMs: number;
}

interface RotatingQRDisplayProps {
  sessionId: string;
  isSessionActive: boolean;
  className?: string;
}

export function RotatingQRDisplay({ sessionId, isSessionActive, className = "" }: RotatingQRDisplayProps) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(QR_ROTATION_INTERVAL_MS);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Fetch a fresh challenge from the server
  const fetchChallenge = useCallback(async () => {
    if (!isSessionActive || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const res = await fetch("/api/host/qr/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to generate QR challenge.");
        return;
      }

      setChallenge(data.challenge);
      setError(null);
      setRemainingMs(QR_ROTATION_INTERVAL_MS);
    } catch (err) {
      console.error("QR Fetch error:", err);
      setError("Network connectivity error during QR rotation.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [sessionId, isSessionActive]);

  // Initial fetch on mount or when session becomes active
  useEffect(() => {
    let isSubscribed = true;

    if (isSessionActive) {
      // Execute async challenge retrieval
      (async () => {
        if (!isSubscribed) return;
        await fetchChallenge();
      })();
    }

    return () => {
      isSubscribed = false;
    };
  }, [isSessionActive, fetchChallenge]);

  // Live countdown timer and automatic rotation trigger
  useEffect(() => {
    if (!isSessionActive || error) return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 1000) {
          // Trigger rotation
          void fetchChallenge();
          return QR_ROTATION_INTERVAL_MS;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive, error, fetchChallenge]);

  // Handle ESC key for modal presentation mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / QR_ROTATION_INTERVAL_MS) * 100));

  const qrBox = (
    <div className="flex flex-col items-center justify-center space-y-4">
      {loading && !challenge ? (
        <div className="flex h-56 w-56 sm:h-64 sm:w-64 flex-col items-center justify-center rounded-2xl border border-cyan-500/20 bg-zinc-950/80 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-2" />
          <span className="font-mono text-xs text-zinc-400">GENERATING TOKEN...</span>
        </div>
      ) : error ? (
        <div className="flex h-56 w-56 sm:h-64 sm:w-64 flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
          <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
          <p className="font-mono text-xs text-rose-300 px-2">{error}</p>
          <button
            onClick={() => fetchChallenge()}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      ) : challenge ? (
        <div className="relative flex flex-col items-center space-y-3">
          {/* High-contrast QR card for easy camera detection */}
          <div className="rounded-2xl border-2 border-cyan-500/40 bg-white p-4 shadow-2xl shadow-cyan-950/50 transition-all duration-200">
            <QRCodeSVG
              value={challenge.payload}
              size={isFullscreen ? 280 : 210}
              level="M"
              includeMargin={false}
              fgColor="#030712"
              bgColor="#ffffff"
            />
          </div>

          {/* Countdown & Progress Bar */}
          <div className="w-full max-w-[210px] space-y-1.5 font-mono text-xs text-center">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-cyan-300 font-medium">
                <Radio className="h-3 w-3 animate-pulse text-cyan-400" />
                <span>ROTATING</span>
              </span>
              <span>
                Expires in <strong className="text-white">{remainingSeconds}s</strong>
              </span>
            </div>

            {/* Smooth visual progress meter */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={`relative rounded-2xl border border-cyan-500/30 bg-[#070d18]/90 backdrop-blur-md p-6 sm:p-7 space-y-4 ${className}`}>
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
              Dynamic Attendance QR
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Cryptographic Anti-Proxy Challenge
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="p-1.5 rounded-lg border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title={isFullscreen ? "Exit presentation mode" : "Room presentation mode"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Main QR Display */}
      {qrBox}

      {/* Presentation Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-lg p-6 animate-fade-in"
          onClick={() => setIsFullscreen(false)}
        >
          <div
            className="dssa-card rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-md w-full border-cyan-500/40 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-300 font-mono">
                <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
                <span>ROOM PRESENTATION BROADCAST</span>
              </div>
              <h3 className="text-xl font-bold text-white pt-2 font-mono">
                Scan with Member Device
              </h3>
            </div>

            {qrBox}

            <button
              onClick={() => setIsFullscreen(false)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            >
              Exit Presentation Mode (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-white/[0.04] text-center text-[11px] font-mono text-zinc-500">
        Tokens rotate automatically every 10s • Stored as SHA-256 in MySQL
      </div>
    </div>
  );
}
