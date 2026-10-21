import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { exchangeCodeForSession } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}))
import { GET } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://unraw.example.com")
  exchangeCodeForSession.mockResolvedValue({ error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe("authentication callback behind a reverse proxy", () => {
  it("uses the public URL when the callback code is missing", async () => {
    const response = await GET(new NextRequest("http://0.0.0.0:3000/auth/callback"))
    expect(response.headers.get("location")).toBe("https://unraw.example.com/login?error=callback")
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it("returns failed exchanges to the public login page", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "Invalid code" } })
    const response = await GET(new NextRequest("http://0.0.0.0:3000/auth/callback?code=expired"))
    expect(response.headers.get("location")).toBe("https://unraw.example.com/login?error=callback")
  })

  it("preserves a safe destination on the public origin", async () => {
    const response = await GET(new NextRequest("http://0.0.0.0:3000/auth/callback?code=test&next=%2Fcapture"))
    expect(response.headers.get("location")).toBe("https://unraw.example.com/capture")
    expect(exchangeCodeForSession).toHaveBeenCalledWith("test")
  })

  it("rejects an external destination", async () => {
    const response = await GET(new NextRequest("http://0.0.0.0:3000/auth/callback?code=test&next=https%3A%2F%2Fother.example"))
    expect(response.headers.get("location")).toBe("https://unraw.example.com/overview")
  })
})
