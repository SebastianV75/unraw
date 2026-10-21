import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { getUser, maybeSingle } = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn() }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}))
import { middleware } from "./middleware"

afterEach(() => vi.unstubAllEnvs())

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key")
  getUser.mockResolvedValue({ data: { user: null } })
})

describe("search route protection", () => {
  it("redirects anonymous searches to login and preserves the destination", async () => {
    const response = await middleware(new NextRequest("https://unraw.test/search?q=idea"))
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("next")).toBe("/search?q=idea")
    expect(maybeSingle).not.toHaveBeenCalled()
  })

  it("requires onboarding before entering search", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    maybeSingle.mockResolvedValue({ data: { onboarding_completed: false } })
    const response = await middleware(new NextRequest("https://unraw.test/search"))
    expect(new URL(response.headers.get("location")!).pathname).toBe("/onboarding")
  })

  it("allows a user who completed onboarding", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    maybeSingle.mockResolvedValue({ data: { onboarding_completed: true } })
    const response = await middleware(new NextRequest("https://unraw.test/search"))
    expect(response.headers.get("location")).toBeNull()
  })
})
