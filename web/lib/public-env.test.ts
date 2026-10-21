import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnv, publicEnvScript } from "./public-env";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("runtime public environment", () => {
  it("reads server variables dynamically", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://first.example");
    expect(getPublicEnv("NEXT_PUBLIC_APP_URL")).toBe("https://first.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://second.example");
    expect(getPublicEnv("NEXT_PUBLIC_APP_URL")).toBe("https://second.example");
  });
  it("uses injected browser values", () => {
    vi.stubGlobal("window", { __UNRAW_PUBLIC_ENV__: { NEXT_PUBLIC_SUPABASE_URL: "https://db.example" } });
    expect(getPublicEnv("NEXT_PUBLIC_SUPABASE_URL")).toBe("https://db.example");
    expect(getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBeUndefined();
  });
  it("never exposes private keys and escapes script injection", () => {
    vi.stubEnv("OPENAI_API_KEY", "private-openai-test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-role-test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "</script><script>alert(1)</script>\u2028\u2029");
    const script = publicEnvScript();
    expect(script).not.toContain("private-");
    expect(script).not.toContain("</script>");
    expect(script).toContain("\\u003c");
    expect(script).toContain("\\u2028");
    const browser: { __UNRAW_PUBLIC_ENV__?: Record<string, string> } = {};
    new Function("window", script)(browser);
    expect(Object.keys(browser.__UNRAW_PUBLIC_ENV__!)).toEqual(["NEXT_PUBLIC_APP_URL"]);
  });
});
