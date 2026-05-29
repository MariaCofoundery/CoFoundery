"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type QrScannerType from "qr-scanner";

type EventQrScannerProps = {
  eventSlug: string;
};

type ScannerState = "idle" | "starting" | "active" | "success" | "error";
type ScanRejectionReason = "invalid" | "external" | "wrong_event";

type ScanValidationResult =
  | {
      ok: true;
      participantToken: string;
    }
  | {
      ok: false;
      reason: ScanRejectionReason;
    };

function decodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

function validateEventCompareQr(rawValue: string, eventSlug: string): ScanValidationResult {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return { ok: false, reason: "invalid" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedValue, window.location.origin);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { ok: false, reason: "external" };
  }

  if (parsedUrl.origin !== window.location.origin) {
    return { ok: false, reason: "external" };
  }

  if (parsedUrl.search || parsedUrl.hash) {
    return { ok: false, reason: "invalid" };
  }

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean).map(decodePathSegment);
  if (pathParts.length !== 4 || pathParts[0] !== "event" || pathParts[2] !== "compare") {
    return { ok: false, reason: "invalid" };
  }

  if (pathParts[1] !== eventSlug) {
    return { ok: false, reason: "wrong_event" };
  }

  const participantToken = pathParts[3]?.trim();
  if (!participantToken) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, participantToken };
}

function rejectionMessage(reason: ScanRejectionReason) {
  switch (reason) {
    case "external":
      return "Dieser QR-Code gehoert nicht zu Cofoundery Event Compare.";
    case "wrong_event":
      return "Dieser QR-Code gehoert zu einem anderen Event.";
    default:
      return "Das ist kein gueltiger Event-QR-Code.";
  }
}

function cameraErrorMessage(error: unknown) {
  const errorName = error instanceof DOMException ? error.name : "";

  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
    return "Die Kamera wurde nicht freigegeben. Du kannst es erneut versuchen oder den Vergleichslink direkt oeffnen.";
  }

  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "Auf diesem Geraet wurde gerade keine Kamera gefunden.";
  }

  return "Der Scanner konnte gerade nicht gestartet werden. Bitte versuche es noch einmal.";
}

export function EventQrScanner({ eventSlug }: EventQrScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const hasHandledScanRef = useRef(false);
  const lastRejectedAtRef = useRef(0);
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleDecodedValue = useCallback(
    (rawValue: string) => {
      if (hasHandledScanRef.current) {
        return;
      }

      const validation = validateEventCompareQr(rawValue, eventSlug);
      if (!validation.ok) {
        const now = Date.now();
        if (now - lastRejectedAtRef.current > 1400) {
          lastRejectedAtRef.current = now;
          setMessage(rejectionMessage(validation.reason));
        }
        return;
      }

      hasHandledScanRef.current = true;
      setScannerState("success");
      setMessage("QR-Code erkannt. Vergleich wird geoeffnet.");
      stopScanner();
      router.push(`/event/${encodeURIComponent(eventSlug)}/compare/${encodeURIComponent(validation.participantToken)}`);
    },
    [eventSlug, router, stopScanner]
  );

  const startCamera = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement || scannerState === "starting" || scannerState === "active") {
      return;
    }

    setScannerState("starting");
    setMessage(null);
    hasHandledScanRef.current = false;

    try {
      const { default: QrScanner } = await import("qr-scanner");
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setScannerState("error");
        setMessage("Auf diesem Geraet wurde gerade keine Kamera gefunden.");
        return;
      }

      const scanner = new QrScanner(
        videoElement,
        (result) => handleDecodedValue(result.data),
        {
          preferredCamera: "environment",
          maxScansPerSecond: 5,
          highlightScanRegion: false,
          highlightCodeOutline: false,
          returnDetailedScanResult: true,
          onDecodeError: () => {
            // No-op: while the camera is moving, "no QR found" is the normal state.
          },
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setScannerState("active");
      setMessage("Halte den QR-Code ruhig in den Rahmen.");
    } catch (error) {
      stopScanner();
      setScannerState("error");
      setMessage(cameraErrorMessage(error));
    }
  }, [handleDecodedValue, scannerState, stopScanner]);

  const isCameraVisible = scannerState === "starting" || scannerState === "active" || scannerState === "success";

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] sm:p-5">
      <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-slate-950">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`aspect-[3/4] w-full object-cover transition-opacity sm:aspect-[4/3] ${
            isCameraVisible ? "opacity-100" : "opacity-0"
          }`}
        />
        {!isCameraVisible ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 px-6 text-center">
            <p className="max-w-xs text-sm leading-6 text-slate-600">
              Starte die Kamera, wenn du den QR-Code einer anderen Person vor dir hast.
            </p>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
          <div className="aspect-square w-full max-w-[250px] rounded-[28px] border border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.26)]" />
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
          {message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={startCamera}
          disabled={scannerState === "starting" || scannerState === "active" || scannerState === "success"}
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          {scannerState === "starting" ? "Kamera startet..." : "Kamera starten"}
        </button>
        {scannerState === "active" ? (
          <button
            type="button"
            onClick={() => {
              stopScanner();
              setScannerState("idle");
              setMessage(null);
            }}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Kamera stoppen
          </button>
        ) : null}
      </div>
    </div>
  );
}
