"use client";

import { useEffect, useRef, useState } from "react";

export function CopyLink({ text }: { text: string }) {
  const [label, setLabel] = useState("Copy");
  const [status, setStatus] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copied");
      setStatus("Copied to clipboard.");
    } catch {
      setStatus(`Copy this link: ${text}`);
    }
    timer.current = window.setTimeout(() => setLabel("Copy"), 2000);
  }

  return (
    <>
      <button type="button" className="copybtn" onClick={copy}>
        {label}
      </button>
      <span className="sr-status" role="status">
        {status}
      </span>
    </>
  );
}
