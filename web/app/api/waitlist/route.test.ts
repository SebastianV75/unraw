import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ insert }) }),
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-21T00:00:00Z"))
  insert.mockResolvedValue({ error: null })
})
afterEach(() => vi.useRealTimers())

function request(ip = "192.0.2.1") {
  return new Request("http://test", {
    method: "POST", headers: { "x-forwarded-for": ip },
    body: JSON.stringify({ email: "test@example.invalid", website: "bot" }),
  })
}

describe("waitlist rate limit", () => {
  it("limits repeated requests and permits them again after expiration", async () => {
    const { POST } = await import("./route")
    for (let i = 0; i < 5; i++) expect((await POST(request())).status).toBe(200)
    expect((await POST(request())).status).toBe(429)
    vi.advanceTimersByTime(10 * 60_000)
    expect((await POST(request())).status).toBe(200)
  })

  it("bounds retained client keys and recovers capacity after expiration", async () => {
    const { POST } = await import("./route")
    for (let i = 0; i < 10_000; i++) await POST(request(`client-${i}`))
    expect((await POST(request("new-client"))).status).toBe(429)
    vi.advanceTimersByTime(10 * 60_000)
    expect((await POST(request("new-client"))).status).toBe(200)
    expect(insert).not.toHaveBeenCalled()
  })
})
