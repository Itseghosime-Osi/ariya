import http from "http";
import crypto from "crypto";
import { Page, BrowserContext, expect } from "@playwright/test";

/**
 * Wait for CSS transitions and finite animations to finish before measuring.
 * After a resize, elements can still be animating to their new size for a few
 * hundred milliseconds, and an Axe scan taken then reports touch targets that
 * are smaller than they really are. Endless animations (skeletons, spinners)
 * are ignored, and the wait is bounded.
 */
export async function waitForAnimationsToSettle(page: Page) {
  await page.evaluate(async () => {
    const running = () =>
      document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === "running" &&
            a.effect !== null &&
            a.effect.getComputedTiming().iterations !== Infinity
        );
    const deadline = performance.now() + 3000;
    while (running().length > 0 && performance.now() < deadline) {
      await Promise.race([
        Promise.all(running().map((a) => a.finished.catch(() => undefined))),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
    }
    // Let the final frame paint.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
  });
}

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
}

export async function createAndLoginUser(
  page: Page,
  context?: BrowserContext,
  emailPrefix = "user"
): Promise<TestUser> {
  if (context) {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }

  const timestamp = Date.now();
  const testUser: TestUser = {
    email: `${emailPrefix}_${timestamp}@owambe.ng`,
    password: "Celebration2026!",
    fullName: `User ${timestamp.toString().slice(-4)}`,
  };

  // Wait for the page to finish hydrating, or WebKit can press Continue before it is wired up.
  await page.goto("/sign-up", { waitUntil: "networkidle" });
  await page.locator("#fullName").fill(testUser.fullName);
  await page.getByTestId("signup-continue").click();
  await page.locator("#emailInput").fill(testUser.email);
  await page.getByTestId("signup-continue").click();
  await page.locator("#password").fill(testUser.password);
  await page.locator("#confirmPassword").fill(testUser.password);
  await page.getByTestId("signup-submit").click();

  await page.waitForURL(/\/(events|sign-in)/, { timeout: 15000 });

  if (page.url().includes("/sign-in")) {
    await page.locator("#email").fill(testUser.email);
    await page.locator("#password").fill(testUser.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/events/, { timeout: 15000 });
  }

  return testUser;
}

export async function createTestEvent(
  page: Page,
  options?: { title?: string; couple?: string; venue?: string }
): Promise<{ eventId: string; title: string; couple: string; venue: string }> {
  const timestamp = Date.now();
  const couple =
    options?.couple || `Kemi & Tunde ${timestamp.toString().slice(-4)}`;
  const title = options?.title || `The Nuptials of ${couple}`;
  const venue = options?.venue || "Grand Ballroom, Victoria Island";

  await page.goto("/events/new");
  await expect(page.locator("h1")).toContainText(/plan your celebration/i);

  // Step 1: who. Two names make a wedding, the default occasion.
  const [first, ...rest] = couple.split(" & ");
  await page.locator("#name-1").fill(first);
  await page.locator("#name-2").fill(rest.join(" & "));
  await page.locator("#title").fill(title);
  await page.getByTestId("wizard-next").click();

  // Step 2: when. A Saturday is already chosen once the page has loaded.
  await expect(page.getByTestId("wizard-next")).toBeEnabled();
  await page.getByTestId("wizard-next").click();

  // Step 3: where.
  await page.locator("#venue").fill(venue);
  await page.locator("#area").fill("Victoria Island, Lagos");
  await page.getByTestId("wizard-next").click();

  // Step 4: guests, then launch.
  await page.getByTestId("wizard-launch").click();

  // Step 4: Direct redirect to celebration workspace (/events/<id>) with success toast
  await page.waitForURL(/\/events\/[0-9a-fA-F-]+/, { timeout: 15000 });
  await expect(page.getByText(/Your event has been created/i)).toBeVisible({
    timeout: 10000,
  });

  const url = page.url();
  const match = url.match(/\/events\/([0-9a-fA-F-]+)/);
  const eventId = match ? match[1] : "";

  return { eventId, title, couple, venue };
}

export function startMockPaystackServer(port = 57328): {
  server: http.Server;
  getLastRef: () => string;
  setAuthorized: (auth: boolean) => void;
} {
  let lastRef = "";
  let isAuthorized = false;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/transaction/initialize") {
      let bodyStr = "";
      req.on("data", (chunk) => {
        bodyStr += chunk;
      });
      req.on("end", () => {
        const body = JSON.parse(bodyStr);
        lastRef = body.reference;
        const callbackUrl = body.callback_url;
        const authUrl = `http://127.0.0.1:${port}/mock-checkout?reference=${body.reference}&callback_url=${encodeURIComponent(callbackUrl)}`;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: true,
            message: "Authorization URL created",
            data: {
              authorization_url: authUrl,
              access_code: "mock_access_code",
              reference: body.reference,
            },
          })
        );
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/mock-checkout") {
      const reference = url.searchParams.get("reference") || "";
      const callbackUrl = url.searchParams.get("callback_url") || "";
      const redirectBackUrl = `${callbackUrl}?reference=${encodeURIComponent(reference)}`;

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Mock Paystack Checkout</title></head>
<body>
  <h1>Paystack Test Gateway</h1>
  <p>Amount: &#8358;50,000</p>
  <a id="paystack-success-btn" href="${redirectBackUrl}">Complete Mock Payment</a>
</body>
</html>`);
      return;
    }

    if (
      req.method === "GET" &&
      url.pathname.startsWith("/transaction/verify/")
    ) {
      const reference = decodeURIComponent(
        url.pathname.replace("/transaction/verify/", "")
      );
      if (isAuthorized) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: true,
            message: "Verification successful",
            data: {
              id: 1234567,
              status: "success",
              reference,
              amount: 5000000,
              currency: "NGN",
              channel: "card",
              paid_at: new Date().toISOString(),
            },
          })
        );
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: true,
            message: "Transaction pending",
            data: {
              id: 1234567,
              status: "pending",
              reference,
              amount: 5000000,
              currency: "NGN",
            },
          })
        );
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: false, message: "Not found" }));
  });

  return {
    server,
    getLastRef: () => lastRef,
    setAuthorized: (auth: boolean) => {
      isAuthorized = auth;
    },
  };
}

export function signPayload(
  payload: string,
  secret = process.env.PAYSTACK_SECRET_KEY || "sk_test_sample"
): string {
  return crypto.createHmac("sha512", secret).update(payload).digest("hex");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Turns the page editor's "Public event page" switch on, if it is off. */
export async function enablePublicPage(page: Page) {
  const toggle = page.getByRole("switch", { name: /public event page/i });
  if ((await toggle.getAttribute("aria-checked")) !== "true") {
    await toggle.click();
  }
}

/**
 * Sets one of our date and time pickers ("2026-12-12T14:00"): opens it, walks to the month,
 * taps the day, the hour, the minute and AM or PM, then Done.
 */
export async function pickDateTime(page: Page, triggerId: string, iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(iso);
  if (!m) throw new Error(`pickDateTime wants YYYY-MM-DDTHH:mm, got ${iso}`);
  const [year, month, day, hour, minute] = m.slice(1).map(Number);

  await page.locator(`#${triggerId}`).click();
  const sheet = page.getByRole("dialog");
  const heading = `${MONTHS[month - 1]} ${year}`;
  for (let i = 0; i < 48; i += 1) {
    if (await sheet.getByText(heading, { exact: true }).isVisible()) break;
    const shown = (await sheet.locator("p[aria-live]").textContent()) ?? "";
    const [name, y] = shown.split(" ");
    const here = Number(y) * 12 + MONTHS.indexOf(name);
    const want = year * 12 + (month - 1);
    await sheet
      .getByRole("button", {
        name: want > here ? "Next month" : "Previous month",
      })
      .click();
  }
  await sheet
    .getByRole("button", {
      name: new RegExp(
        `^\\w{3} ${day} ${MONTHS[month - 1].slice(0, 3)} ${year}$`
      ),
    })
    .click();
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  await sheet
    .getByRole("button", { name: `${h12} o'clock`, exact: true })
    .click();
  await sheet
    .getByRole("button", { name: `${minute} minutes`, exact: true })
    .click();
  await sheet
    .getByRole("button", { name: hour >= 12 ? "PM" : "AM", exact: true })
    .click();
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
}
