import { describe, it, expect, vi, afterEach } from "vitest";
import {
  appBaseUrl,
  mcpResourceUrl,
  protectedResourceMetadata,
  protectedResourceResponse,
  resourceMetadataUrl,
  wwwAuthenticateHeader,
} from "./metadata";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("protectedResourceMetadata", () => {
  it("advertises this deployment's endpoint and its Supabase auth server", () => {
    expect(protectedResourceMetadata()).toEqual({
      resource: "http://localhost:3000/mcp",
      authorization_servers: ["http://127.0.0.1:57321/auth/v1"],
      bearer_methods_supported: ["header"],
      resource_name: "Àríyá",
      resource_documentation: "http://localhost:3000/connect-ai",
    });
  });

  it("gives a client one URL to discover the auth server from", () => {
    expect(resourceMetadataUrl()).toBe(
      "http://localhost:3000/.well-known/oauth-protected-resource"
    );
    expect(mcpResourceUrl()).toBe("http://localhost:3000/mcp");
  });

  it("builds the RFC 9728 challenge from that URL", () => {
    expect(wwwAuthenticateHeader()).toBe(
      'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"'
    );
  });
});

describe("protectedResourceResponse", () => {
  it("serves the document as cacheable JSON that any connector may read", async () => {
    const response = protectedResourceResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    await expect(response.json()).resolves.toEqual(protectedResourceMetadata());
  });
});

describe("appBaseUrl", () => {
  it("drops a trailing slash so paths never double up", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ariya.example/");
    vi.resetModules();

    const fresh = await import("./metadata");

    expect(fresh.appBaseUrl()).toBe("https://ariya.example");
    expect(fresh.mcpResourceUrl()).toBe("https://ariya.example/mcp");
  });

  it("is the value the module was loaded with when nothing overrides it", () => {
    expect(appBaseUrl()).toBe("http://localhost:3000");
  });
});
