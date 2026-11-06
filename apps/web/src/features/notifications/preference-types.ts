/**
 * The shape of a person's reminder settings, shared by the action file and the client.
 *
 * Kept apart from `preferences.ts` because that file is `"use server"`, and such a file may only
 * export async functions — a constant or a type living there breaks the whole module.
 */

export type DigestCadence = "weekly" | "off";

export interface NotificationPreferences {
  digest: DigestCadence;
  quietFrom: string;
  quietTo: string;
}

/** Weekly by default, with the evening quiet window research §F.6 settled on. */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  digest: "weekly",
  quietFrom: "21:00",
  quietTo: "07:00",
};
