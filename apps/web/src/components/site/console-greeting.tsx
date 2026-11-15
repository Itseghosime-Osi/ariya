"use client";

import { useEffect } from "react";
import { greetConsole } from "@/lib/console-greeting";

/** Says hello in the browser console (for the curious, and for anyone hitting a problem). Renders nothing. */
export function ConsoleGreeting() {
  useEffect(() => {
    greetConsole();
  }, []);
  return null;
}
