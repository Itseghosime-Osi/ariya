/**
 * Where the desk keeps its copy of the guest list and its queue of admissions: this browser's own
 * storage, per celebration. Storage can be full or blocked (a private window); then the desk simply
 * works online only, as it did before.
 */
import {
  isExpired,
  type CheckInSnapshot,
  type QueuedAdmission,
} from "./offline";

const LIST = (eventId: string) => `ariya:checkin-list:${eventId}`;
const QUEUE = (eventId: string) => `ariya:checkin-queue:${eventId}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSnapshot(eventId: string): CheckInSnapshot | null {
  const s = read<CheckInSnapshot>(LIST(eventId));
  if (!s || s.eventId !== eventId || !Array.isArray(s.guests)) return null;
  return s;
}

export function saveSnapshot(snapshot: CheckInSnapshot): boolean {
  return write(LIST(snapshot.eventId), snapshot);
}

export function loadQueue(eventId: string): QueuedAdmission[] {
  const q = read<QueuedAdmission[]>(QUEUE(eventId));
  return Array.isArray(q) ? q : [];
}

export function saveQueue(eventId: string, queue: QueuedAdmission[]): boolean {
  return write(QUEUE(eventId), queue);
}

/**
 * Wipe copies of guest lists for celebrations that are over, so a borrowed phone does not keep
 * names and passes for longer than the day needs. A queue still waiting to be sent is never
 * dropped: those are people who came in.
 */
export function wipeExpired(now = Date.now()) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith("ariya:checkin-list:")) continue;
      const eventId = key.slice("ariya:checkin-list:".length);
      const s = read<CheckInSnapshot>(key);
      if (s && isExpired(s, now) && loadQueue(eventId).length === 0)
        localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable: nothing to wipe */
  }
}
