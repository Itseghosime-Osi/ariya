"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createScaledPassRetry } from "../scaled-pass-retry";
import { Icon } from "@/components/ui/icon";

interface PassDetector {
  detect(video: HTMLVideoElement): Promise<{ rawValue?: string }[]>;
}
interface PassDetectorConstructor {
  new (options: { formats: string[] }): PassDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

function cameraErrorMessage(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera permission was blocked. Allow camera access in your browser’s site settings and try again.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "No camera was found. Connect a camera or try another device.";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "The camera could not start. Close other apps using it and try again.";
  return error instanceof Error
    ? error.message
    : "Unable to access the camera. Please try again.";
}

interface CheckInCameraScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

export function CheckInCameraScanner({
  onScan,
  disabled,
}: CheckInCameraScannerProps) {
  const [isActive, setIsActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopCamera = useCallback(() => setIsActive(false), []);
  const startCamera = () => {
    setCameraError(null);
    setIsActive(true);
  };

  // Start after React commits the video element. Each activation owns its own
  // stream and decoder, including requests that resolve after closing/unmounting.
  useEffect(() => {
    if (!isActive) return;
    if (disabled) {
      setIsActive(false);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let detected = false;
    let stream: MediaStream | null = null;
    let controls: { stop: () => void } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      if (timer) clearTimeout(timer);
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
      video.pause();
      video.srcObject = null;
    };
    const report = (value: string) => {
      const code = value.trim();
      if (cancelled || detected || !code) return;
      detected = true;
      release();
      setIsActive(false);
      onScanRef.current(code);
    };
    const fail = (error: unknown) => {
      if (cancelled || detected) return;
      release();
      setCameraError(cameraErrorMessage(error));
      setIsActive(false);
    };

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            window.isSecureContext
              ? "This browser cannot access a camera. Try a supported browser."
              : "Camera access requires a secure HTTPS connection."
          );
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video!.srcObject = stream;
        await video!.play();
        if (cancelled || detected) return;

        // Some browsers expose BarcodeDetector without supporting QR codes or
        // Code 128. Use only supported formats and otherwise fall back to ZXing.
        let detector: PassDetector | undefined;
        const NativeDetector = (
          window as Window & { BarcodeDetector?: PassDetectorConstructor }
        ).BarcodeDetector;
        if (NativeDetector) {
          try {
            const supported = NativeDetector.getSupportedFormats
              ? await NativeDetector.getSupportedFormats()
              : ["qr_code", "code_128"];
            const formats = ["qr_code", "code_128"].filter((format) =>
              supported.includes(format)
            );
            if (formats.includes("qr_code"))
              detector = new NativeDetector({ formats });
          } catch {
            /* A partial native implementation uses the fallback below. */
          }
        }
        if (cancelled || detected) return;
        if (detector) {
          const scanFrame = async () => {
            if (cancelled || detected) return;
            // Avoid empty frames, and never run two native decodes at once.
            if (video!.readyState >= 2 && video!.videoWidth > 0) {
              try {
                const values = await detector!.detect(video!);
                const value = values.find((value) => value.rawValue?.trim());
                if (value?.rawValue) report(value.rawValue);
              } catch {
                /* A moving or unreadable frame can be tried again. */
              }
            }
            if (!cancelled && !detected)
              timer = setTimeout(() => void scanFrame(), 250);
          };
          void scanFrame();
        } else {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          if (cancelled || detected) return;
          const reader = new BrowserQRCodeReader();
          const retryScaled = createScaledPassRetry(reader);
          controls = await reader.decodeFromVideoElement(video!, (result) => {
            if (cancelled || detected) return;
            if (result) report(result.getText());
            else {
              const code = retryScaled(video!);
              if (code) report(code);
            }
          });
          if (cancelled || detected) controls.stop();
        }
      } catch (error) {
        fail(error);
      }
    }
    void start();
    return () => {
      cancelled = true;
      release();
    };
  }, [isActive, disabled]);

  return (
    <section className="bento-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="camera" className="text-base text-gold-ink" />
          <h2 className="font-display text-lg font-bold text-night">
            Camera QR &amp; Pass Scanner
          </h2>
        </div>
        <button
          type="button"
          onClick={isActive ? stopCamera : startCamera}
          disabled={disabled}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
            isActive
              ? "desk-chip text-burgundy"
              : "bg-burgundy text-ivory hover:bg-night"
          }`}
        >
          <Icon name={isActive ? "close" : "camera"} className="text-sm" />
          <span>{isActive ? "Turn Off Camera" : "Scan a pass"}</span>
        </button>
      </div>

      {cameraError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 p-3 text-[13px] text-red-900"
        >
          <Icon name="close" className="text-sm shrink-0" />
          <span>
            {cameraError} (Use manual code entry below if camera is
            unavailable).
          </span>
        </div>
      )}

      {isActive ? (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-72 mx-auto flex items-center justify-center border border-hairline">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />
          {/* Target scan frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-gold/80 rounded-2xl relative shadow-2xl">
              <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-gold" />
              <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-gold" />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-gold" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-gold" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-dashed border-hairline px-6 py-8 text-center">
          <Icon
            name="qr_code_scanner"
            className="mx-auto block text-3xl text-gold-ink"
          />
          <p className="text-sm font-semibold text-night">
            Camera Scanner Standby
          </p>
          <p className="mx-auto max-w-xs text-[13px] text-label-2">
            Scan attendee passes directly with your phone, tablet, or laptop
            webcam.
          </p>
        </div>
      )}
    </section>
  );
}
