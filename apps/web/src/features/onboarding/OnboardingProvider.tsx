"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setHostRoleAction, updateOnboardingAction } from "./actions";
import {
  mergeOnboarding,
  readOnboarding,
  type HostRole,
  type Onboarding,
} from "./state";

function readLocal(key: string): Onboarding {
  try {
    return readOnboarding({
      onboarding: JSON.parse(localStorage.getItem(key) ?? "null"),
    });
  } catch {
    return {};
  }
}

function writeLocal(key: string, value: Onboarding) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: the account's copy is enough */
  }
}

interface OnboardingContextValue {
  state: Onboarding;
  role: HostRole;
  /** Record progress: the screen changes at once, and the account is updated behind it. */
  update: (patch: Onboarding) => void;
  setRole: (role: HostRole) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  initial,
  initialRole,
  storageKey,
  children,
}: {
  initial: Onboarding;
  initialRole: HostRole;
  /** Where this device keeps its own copy, per account. */
  storageKey: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState(initial);
  const [role, setRoleState] = useState(initialRole);

  // The account's copy is saved in the background; a reload that beats the save still finds what
  // was seen on this device. The flags only move forward, so merging the two never undoes one.
  useEffect(() => {
    setState((s) => mergeOnboarding(s, readLocal(storageKey)));
  }, [storageKey]);

  const update = useCallback(
    (patch: Onboarding) => {
      setState((s) => {
        const next = mergeOnboarding(s, patch);
        writeLocal(storageKey, next);
        return next;
      });
      // A failed save only means the card may show once more on another device.
      void updateOnboardingAction(patch).catch(() => undefined);
    },
    [storageKey]
  );

  const setRole = useCallback((next: HostRole) => {
    setRoleState(next);
    void setHostRoleAction(next).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ state, role, update, setRole }),
    [state, role, update, setRole]
  );
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

/** The onboarding state, or null outside the signed-in app (a print page, a test). */
export function useOnboarding() {
  return useContext(OnboardingContext);
}

/**
 * Whether automatic onboarding may appear. Automated browsers start every test as a brand-new
 * account; the cards would cover the very buttons the tests press, so they stay away unless a test
 * asks for them.
 */
export function autoOnboardingAllowed() {
  if (typeof navigator === "undefined") return false;
  if (!navigator.webdriver) return true;
  try {
    return localStorage.getItem("ariya:test-onboarding") === "on";
  } catch {
    return false;
  }
}

/**
 * Run `fn` once no fireworks are on screen (the sign-up welcome, or a new celebration's "It's
 * official"), so nothing is asked over them. Checks after `delay`, then every half second, for at
 * most twenty seconds. Returns a cancel.
 */
export function afterFireworks(fn: () => void, delay = 600): () => void {
  let timer = 0;
  const started = Date.now();
  const check = () => {
    const playing = document.querySelector('[data-testid="fireworks"]');
    if (playing && Date.now() - started < 20_000) {
      timer = window.setTimeout(check, 500);
      return;
    }
    fn();
  };
  timer = window.setTimeout(check, delay);
  return () => window.clearTimeout(timer);
}
