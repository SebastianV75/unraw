import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUser, createClient } = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ getUser, createClient }))

import { DELETE, GET, PUT } from "./route"

const user = { id: "user-1" }
function clientFor({ current, currentError, updateError }: {
  current?: { openrouter_token: string | null }
  currentError?: { message: string }
  updateError?: { message: string }
} = {}) {
  const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: updateError ?? null })) }))
  const single = vi.fn(async () => ({ data: current ?? { openrouter_token: null }, error: currentError ?? null }))
  createClient.mockResolvedValue({ from: vi.fn(() => ({ select: () => ({ eq: () => ({ single }) }), update })) })
  return { update, single }
}
async function json(response: Response) { return response.json() }

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue(user)
})

describe("OpenRouter settings route", () => {
  it.each(["PUT", "DELETE"]) ("requires authentication for %s", async (method) => {
    getUser.mockResolvedValue(null)
    const response = method === "PUT"
      ? await PUT(new Request("http://test", { method, body: JSON.stringify({ model: "openai/gpt-5-nano" }) }))
      : await DELETE()
    expect(response.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it("requires authentication for GET", async () => {
    getUser.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON and invalid settings", async () => {
    expect((await PUT(new Request("http://test", { method: "PUT", body: "{" }))).status).toBe(400)
    expect((await PUT(new Request("http://test", { method: "PUT", body: JSON.stringify({ model: "" }) }))).status).toBe(400)
  })

  it("preserves the encrypted token when replacing only the model", async () => {
    const { update } = clientFor({ current: { openrouter_token: "encrypted-value" } })
    const response = await PUT(new Request("http://test", { method: "PUT", body: JSON.stringify({ model: "openai/gpt-5-nano" }) }))
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ openrouter_model: "openai/gpt-5-nano", tier: "openrouter" })
    expect(JSON.stringify(await json(response))).not.toContain("encrypted-value")
  })

  it("replaces the token without returning plaintext", async () => {
    const { update } = clientFor()
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    const plaintext = "sk-or-v1-test-secret"
    const response = await PUT(new Request("http://test", { method: "PUT", body: JSON.stringify({ apiKey: plaintext, model: "openai/gpt-5-nano" }) }))
    expect(response.status).toBe(200)
    expect(JSON.stringify(await json(response))).not.toContain(plaintext)
    expect((update.mock.calls[0] as unknown as [{ openrouter_token?: string }])[0].openrouter_token).not.toBe(plaintext)
    delete process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY
  })

  it("returns safe errors for database failures", async () => {
    clientFor({ currentError: { message: "secret database detail" } })
    const response = await GET()
    expect(response.status).toBe(500)
    expect(JSON.stringify(await json(response))).not.toContain("secret database detail")

    clientFor({ current: { openrouter_token: "encrypted-value" }, updateError: { message: "secret update detail" } })
    const updateResponse = await PUT(new Request("http://test", { method: "PUT", body: JSON.stringify({ model: "openai/gpt-5-nano" }) }))
    expect(updateResponse.status).toBe(500)
    expect(JSON.stringify(await json(updateResponse))).not.toContain("secret update detail")
  })

  it("disconnects token, tier and model to the same free default", async () => {
    const { update } = clientFor()
    const response = await DELETE()
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ openrouter_token: null, openrouter_model: "openai/gpt-5-nano", tier: "free" })
    expect(await json(response)).toEqual({ configured: false, model: "openai/gpt-5-nano" })
  })
})
