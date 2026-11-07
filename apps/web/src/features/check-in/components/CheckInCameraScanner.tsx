"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/icon";

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
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isScanningRef.current = false;
    setIsActive(false);
  }, []);

  const handleDetected = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;
      // Stop scanner loop momentarily to avoid duplicate bursts
      isScanningRef.current = false;
      onScan(clean);
      setTimeout(() => {
        isScanningRef.current = true;
      }, 2000);
    },
    [onScan]
  );

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      isScanningRef.current = true;

      // Check if native BarcodeDetector is available
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        const detector = new BarcodeDetectorClass({
          formats: ["qr_code", "code_128"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!isScanningRef.current || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetected(barcodes[0].rawValue);
            }
          } catch {
            // Frame processing catch
          }
        }, 400);
      } else {
        // Fallback to @zxing/browser
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (videoRef.current) {
          reader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result && isScanningRef.current) {
              handleDetected(result.getText());
            }
          });
        }
      }
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Unable to access camera device."
      );
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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
          <span>{isActive ? "Turn Off Camera" : "Launch Camera Scanner"}</span>
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
