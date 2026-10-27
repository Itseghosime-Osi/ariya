import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  createAndLoginUser,
  createTestEvent,
} from "../e2e/fixtures/test-helpers";

const OUT_DIR = path.join(process.cwd(), "public", "screenshots");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function main() {
  const browser = await chromium.launch();

  // Desktop context
  const desktopContext = await browser.newContext({
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();

  // Mobile context (390px)
  const mobileContext = await browser.newContext({
    baseURL: "http://localhost:3000",
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log("Logging in user...");
  await createAndLoginUser(desktopPage, desktopContext);

  console.log("Creating test celebration...");
  const { eventId } = await createTestEvent(desktopPage, {
    title: "The Nuptials of Chidinma Okonkwo & Babatunde Adeleke",
    couple: "Chidinma & Babatunde",
    venue: "The Grand Pavilion, Victoria Island",
  });
  console.log("Created event ID:", eventId);

  // Transfer cookies to mobile context
  const cookies = await desktopContext.cookies();
  await mobileContext.addCookies(cookies);

  const routes = [
    { name: "final-01-overview", path: `/events/${eventId}` },
    { name: "final-02-my-events", path: `/events` },
    { name: "final-03-guests", path: `/events/${eventId}/guests` },
    { name: "final-04-seating", path: `/events/${eventId}/seating` },
    { name: "final-05-invitations", path: `/events/${eventId}/invitations` },
    { name: "v2-14-page-editor", path: `/events/${eventId}/page-editor` },
    { name: "v2-13-settings", path: `/events/${eventId}/settings` },
    { name: "v2-22-guests-import", path: `/events/${eventId}/guests/import` },
    { name: "support-01-vendors", path: `/events/${eventId}/vendors` },
    { name: "v2-20-check-in", path: `/events/${eventId}/check-in` },
    { name: "v2-15-reminders", path: `/events/${eventId}/reminders` },
    { name: "v2-18-billing", path: `/events/${eventId}/billing` },
  ];

  for (const r of routes) {
    console.log(`Capturing ${r.name}...`);
    // Desktop
    await desktopPage.goto(`http://localhost:3000${r.path}`);
    await desktopPage.waitForLoadState("networkidle");
    await desktopPage.screenshot({
      path: path.join(OUT_DIR, `${r.name}-desktop.png`),
      fullPage: false,
    });

    // Mobile
    await mobilePage.goto(`http://localhost:3000${r.path}`);
    await mobilePage.waitForLoadState("networkidle");
    await mobilePage.screenshot({
      path: path.join(OUT_DIR, `${r.name}-mobile.png`),
      fullPage: false,
    });
  }

  // Enable isPublic in settings and capture public event page
  await desktopPage.goto(`http://localhost:3000/events/${eventId}/settings`);
  const publicCheckbox = desktopPage.locator('input[type="checkbox"]');
  if (!(await publicCheckbox.isChecked())) {
    await publicCheckbox.click();
    await desktopPage.getByRole("button", { name: /save/i }).click();
    await desktopPage.waitForTimeout(1000);
  }

  // Get slug from settings input
  const slugInput = desktopPage
    .locator('input[name="slug"], input[value*="the-nuptials"]')
    .first();
  const slugVal = await slugInput.inputValue();
  console.log("Capturing public page for slug:", slugVal);

  await desktopPage.goto(`http://localhost:3000/e/${slugVal}`);
  await desktopPage.waitForLoadState("networkidle");
  await desktopPage.screenshot({
    path: path.join(OUT_DIR, "v2-14-public-event-page-desktop.png"),
    fullPage: false,
  });

  await mobilePage.goto(`http://localhost:3000/e/${slugVal}`);
  await mobilePage.waitForLoadState("networkidle");
  await mobilePage.screenshot({
    path: path.join(OUT_DIR, "v2-14-public-event-page-mobile.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("All screenshots captured in public/screenshots/!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
