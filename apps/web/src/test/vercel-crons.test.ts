import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Vercel's Hobby plan refuses any cron that runs more than once a day, and a refused cron fails the
 * whole deployment (not just the cron). Anything that has to run more often belongs in a GitHub
 * Actions schedule (see .github/workflows/cron-digest.yml), so this keeps vercel.json honest.
 */
describe("vercel.json crons", () => {
  const config = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../vercel.json"), "utf8")
  ) as { crons?: { path: string; schedule: string }[] };

  it("only declares crons that run at most once a day", () => {
    for (const { path: route, schedule } of config.crons ?? []) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule.split(" ");
      const single = (field: string) => /^\d+$/.test(field);
      expect(
        single(minute) && single(hour),
        `${route} (${schedule}) runs more than once a day`
      ).toBe(true);
      // Day, month and weekday may repeat or be a star: that is daily or rarer, never more often.
      expect(dayOfMonth && month && dayOfWeek).toBeTruthy();
    }
  });

  it("does not schedule the digest, which runs from GitHub Actions", () => {
    expect(
      (config.crons ?? []).some((c) => c.path === "/api/cron/digest")
    ).toBe(false);
  });
});
