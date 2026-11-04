/**
 * Preferences kept on this device (they describe how this phone or computer should behave, so they
 * live in its own storage, not the account). Storage can be unavailable (private windows), so every
 * read falls back to the default and every write is best-effort.
 */
export const DEVICE_PREFS = {
  /** The petals splash when the installed app opens. */
  splash: "ariya:pref:splash",
  /** Fireworks when the app opens on the day of a celebration. */
  fireworks: "ariya:pref:fireworks",
} as const;

export type DevicePref = keyof typeof DEVICE_PREFS;

/** Every preference is on unless it has been switched off on this device. */
export function readDevicePref(pref: DevicePref): boolean {
  try {
    return localStorage.getItem(DEVICE_PREFS[pref]) !== "off";
  } catch {
    return true;
  }
}

export function writeDevicePref(pref: DevicePref, on: boolean): void {
  try {
    if (on) localStorage.removeItem(DEVICE_PREFS[pref]);
    else localStorage.setItem(DEVICE_PREFS[pref], "off");
  } catch {
    /* storage unavailable: the choice lasts for this visit only */
  }
}
