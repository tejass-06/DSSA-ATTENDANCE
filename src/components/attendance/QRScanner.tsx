"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  Info,
  User,
} from "lucide-react";
import { submitAttendanceAction } from "@/app/attendance/actions";
import type { AttendanceSubmissionResult } from "@/lib/attendance/service";

interface QRScannerProps {
  userName: string;
  userRole: string;
}

type ScanStatus =
  | "idle"
  | "requesting"
  | "scanning"
  | "submitting"
  | "success"
  | "already_marked"
  | "error";

export function QRScanner({ userName, userRole }: QRScannerProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] =
    useState<AttendanceSubmissionResult | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check available cameras
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter(
            (device) => device.kind === "videoinput"
          );
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {
          // Ignore device enumeration errors
        });
    }

    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle scanned payload
  const handleDetectedPayload = useCallback(async (rawQrText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    stopCamera();
    setStatus("submitting");

    try {
      const result = await submitAttendanceAction(rawQrText);
      setSubmissionResult(result);

      if (result.success) {
        if (result.alreadyMarked) {
          setStatus("already_marked");
        } else {
          setStatus("success");
        }
      } else {
        setErrorMessage(result.error || "Attendance submission failed.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network or connection error. Please try again.");
      setStatus("error");
    } finally {
      isProcessingRef.current = false;
    }
  }, [stopCamera]);

  const handleDetectedPayloadRef = useRef(handleDetectedPayload);
  useEffect(() => {
    handleDetectedPayloadRef.current = handleDetectedPayload;
  }, [handleDetectedPayload]);

  const scanLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    scanLoopRef.current = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data && !isProcessingRef.current) {
          handleDetectedPayloadRef.current(code.data);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        scanLoopRef.current();
      });
    };
  });

  // Start camera stream
  const startCamera = async (selectedFacingMode = facingMode) => {
    stopCamera();
    setStatus("requesting");
    setErrorMessage(null);
    setSubmissionResult(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setStatus("error");
      setErrorMessage(
        "Camera access is not supported by your browser or insecure connection (HTTPS required)."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: selectedFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // Required for iOS
        await videoRef.current.play();
        setStatus("scanning");
        animationFrameRef.current = requestAnimationFrame(() => {
          scanLoopRef.current();
        });
      }
    } catch (err: unknown) {

      stopCamera();
      setStatus("error");
      const error = err as Error;
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setErrorMessage(
          "Camera permission was denied. Please allow camera access in your browser settings to scan attendance QR codes."
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setErrorMessage(
          "No camera detected on this device. Please connect a camera or use a mobile device."
        );
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        setErrorMessage(
          "Camera is currently in use by another application. Please close other apps using the camera."
        );
      } else {
        setErrorMessage("Failed to start camera. " + (error.message || ""));
      }
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (status === "scanning" || status === "requesting") {
      startCamera(nextMode);
    }
  };

  const resetScanner = () => {
    stopCamera();
    setStatus("idle");
    setErrorMessage(null);
    setSubmissionResult(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Scanner Container */}
      <div className="dssa-card rounded-2xl p-4 sm:p-6 border border-white/10 bg-zinc-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* 1. IDLE STATE */}
        {status === "idle" && (
          <div className="py-8 px-4 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Scan Rotating Attendance QR
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                Aim your device camera at the live rotating QR code shown on the
                committee room projector or host screen.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-3.5 text-xs text-zinc-300 flex items-center justify-center gap-2 max-w-md mx-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Authenticated as{" "}
                <strong className="text-emerald-300">{userName}</strong> (
                {userRole})
              </span>
            </div>

            <button
              onClick={() => startCamera()}
              className="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-mono tracking-wide shadow-lg shadow-emerald-950/40 transition-all cursor-pointer active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>START QR SCANNER</span>
            </button>
          </div>
        )}

        {/* 2. REQUESTING / STARTING STATE */}
        {status === "requesting" && (
          <div className="py-12 px-4 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 animate-pulse">
              <Camera className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Accessing Camera...
            </h3>
            <p className="text-xs text-zinc-400">
              Please grant camera permission when prompted by your browser.
            </p>
          </div>
        )}

        {/* 3. SCANNING STATE */}
        <div
          className={`relative rounded-xl overflow-hidden bg-black aspect-square max-h-[380px] mx-auto border border-white/10 ${
            status === "scanning" || status === "submitting" ? "block" : "hidden"
          }`}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Viewfinder Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Darkened corner mask */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Laser scan line animation */}
              {status === "scanning" && (
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-scan-laser" />
              )}
            </div>
          </div>

          {/* Submitting Spinner Overlay */}
          {status === "submitting" && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-emerald-400">
              <Sparkles className="w-8 h-8 animate-spin" />
              <p className="text-xs sm:text-sm font-mono tracking-wider font-semibold text-white">
                VALIDATING & RECORDING ATTENDANCE...
              </p>
              <p className="text-[11px] text-zinc-400">
                Verifying cryptographic token with server
              </p>
            </div>
          )}

          {/* Scanner Controls Bar */}
          <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
            <button
              type="button"
              onClick={stopCamera}
              className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-zinc-300 hover:text-white text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>

            {hasMultipleCameras && (
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-zinc-300 hover:text-white text-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Flip Camera</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. SUCCESS STATE */}
        {status === "success" && submissionResult?.record && (
          <div className="py-6 px-2 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Attendance Marked!
              </h3>
              <p className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                Status: {submissionResult.record.status} (Verified Present)
              </p>
            </div>

            {/* Attendance Confirmation Details */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-start justify-between border-b border-emerald-500/20 pb-2.5">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Session:
                </span>
                <span className="font-semibold text-white text-right max-w-[60%] truncate">
                  {submissionResult.record.sessionTitle}
                </span>
              </div>

              <div className="flex items-start justify-between border-b border-emerald-500/20 pb-2.5">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" /> Room:
                </span>
                <span className="font-medium text-emerald-200">
                  {submissionResult.record.roomName} (
                  {submissionResult.record.roomCode})
                </span>
              </div>

              <div className="flex items-start justify-between border-b border-emerald-500/20 pb-2.5">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-400" /> Attendee:
                </span>
                <span className="font-medium text-white">
                  {submissionResult.record.attendeeName}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" /> Server Time:
                </span>
                <span className="font-mono text-emerald-300">
                  {new Date(submissionResult.record.markedAt).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    }
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={resetScanner}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. ALREADY MARKED STATE */}
        {status === "already_marked" && submissionResult?.record && (
          <div className="py-6 px-2 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                <Info className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Already Marked
              </h3>
              <p className="text-xs text-zinc-400">
                Your attendance for this session was already recorded earlier.
              </p>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-start justify-between border-b border-cyan-500/20 pb-2.5">
                <span className="text-zinc-400">Session:</span>
                <span className="font-semibold text-white text-right max-w-[60%] truncate">
                  {submissionResult.record.sessionTitle}
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-cyan-500/20 pb-2.5">
                <span className="text-zinc-400">Room:</span>
                <span className="font-medium text-cyan-200">
                  {submissionResult.record.roomName} (
                  {submissionResult.record.roomCode})
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-zinc-400">Recorded At:</span>
                <span className="font-mono text-cyan-300">
                  {new Date(submissionResult.record.markedAt).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    }
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetScanner}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Scanner</span>
            </button>
          </div>
        )}

        {/* 6. ERROR STATE */}
        {status === "error" && (
          <div className="py-6 px-2 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
                <AlertCircle className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Attendance Could Not Be Recorded
              </h3>
              <p className="text-xs sm:text-sm text-rose-300 max-w-md mx-auto leading-relaxed">
                {errorMessage || "An error occurred while validating the QR code."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => startCamera()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-rose-600 hover:bg-rose-500 text-white font-mono tracking-wide transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>TRY SCANNING AGAIN</span>
              </button>
              <button
                type="button"
                onClick={resetScanner}
                className="px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
