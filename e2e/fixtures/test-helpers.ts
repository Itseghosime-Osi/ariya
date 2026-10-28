import http from "http";
import crypto from "crypto";
import { Page, BrowserContext, expect } from "@playwright/test";

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

  await page.goto("/sign-up");
  await page.locator("#fullName").fill(testUser.fullName);
  await page.locator("#emailInput").fill(testUser.email);
  await page.locator("#password").fill(testUser.password);
  await page.locator("#confirmPassword").fill(testUser.password);
  await page
    .getByRole("button", { name: /create celebration account/i })
    .click();

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
  await expect(page.locator("h1")).toContainText(
    /Create & Set Up Celebration/i
  );

  // Step 1: Celebration Details
  await page.locator("#couple").fill(couple);
  await page.locator("#title").fill(title);
  await page.locator("#venue").fill(venue);
  await page.locator("#area").fill("Victoria Island, Lagos");

  // Step 2: Intake Method
  await page
    .getByRole("button", { name: /continue to guest registry setup/i })
    .click();

  // Step 3: Review & Launch
  await page.getByRole("button", { name: /continue to review/i }).click();

  await page
    .getByRole("button", { name: /create celebration workspace/i })
    .click();

  // Step 4: Direct redirect to celebration workspace (/events/<id>) with success toast
  await page.waitForURL(/\/events\/[0-9a-fA-F-]+/, { timeout: 15000 });
  await expect(page.getByText(/Celebration workspace ready/i)).toBeVisible({
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
