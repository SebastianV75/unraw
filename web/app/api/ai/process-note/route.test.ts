import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUser, createClient, createAdminClient, processNote, decryptOpenRouterToken } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  processNote: vi.fn(),
  decryptOpenRouterToken: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ getUser, createClient }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }))
vi.mock("@/lib/security/openrouter-token", () => ({ decryptOpenRouterToken }))
vi.mock("@/lib/ai/process-note", async () => ({
  ...(await vi.importActual<typeof import("@/lib/ai/process-note")>("@/lib/ai/process-note")),
  processNote,
}))

import { POST } from "./route"

const body = { raw_note: "Buy milk", timezone: "UTC" }
function query(result: unknown) {
  const chain = {
    eq: () => chain,
    single: async () => result,
    order: () => chain,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  return { select: () => chain }
}
function clientFor(profile: unknown, rpcResults: Record<string, unknown> = {}) {
  const rpc = vi.fn(async (name: string) => rpcResults[name] ?? { data: null, error: null })
  const adminRpc = vi.fn(async () => rpcResults.refund_free_capture ?? { data: null, error: null })
  createClient.mockResolvedValue({
    from: (table: string) => query(table === "profiles" ? { data: profile, error: null } : { data: [], error: null }),
    rpc,
  })
  createAdminClient.mockReturnValue({ rpc: adminRpc })
  return { rpc, adminRpc }
}
async function post() {
  return POST(new Request("http://test", { method: "POST", body: JSON.stringify(body) }))
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.OPENAI_API_KEY = "test-openai-key"
  getUser.mockResolvedValue({ id: "user-1" })
  processNote.mockResolvedValue({ tasks: [], ideas: [], second_brain: [], suggestions: [] })
  decryptOpenRouterToken.mockReturnValue("sk-or-secret")
})

describe("process-note route", () => {
  it("uses the free model and consumes quota", async () => {
    const { rpc } = clientFor({ tier: "free", openrouter_token: null, openrouter_model: null }, {
      consume_free_capture: { data: [{ allowed: true }], error: null },
    })
    expect((await post()).status).toBe(200)
    expect(processNote).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-nano", baseURL: undefined }))
    expect(rpc).toHaveBeenCalledWith("consume_free_capture")
  })

  it("uses the configured OpenRouter model and base URL", async () => {
    clientFor({ tier: "openrouter", openrouter_token: "ciphertext", openrouter_model: "anthropic/claude-3.5-haiku" })
    expect((await post()).status).toBe(200)
    expect(decryptOpenRouterToken).toHaveBeenCalledWith("ciphertext")
    expect(processNote).toHaveBeenCalledWith(expect.objectContaining({ model: "anthropic/claude-3.5-haiku", baseURL: "https://openrouter.ai/api/v1", apiKey: "sk-or-secret" }))
  })

  it("does not call the model when the token cannot be decrypted", async () => {
    clientFor({ tier: "openrouter", openrouter_token: "ciphertext", openrouter_model: "openai/gpt-5-nano" })
    decryptOpenRouterToken.mockImplementation(() => { throw new Error("tampered") })
    expect((await post()).status).toBe(503)
    expect(processNote).not.toHaveBeenCalled()
  })

  it("refunds consumed free quota when processing fails", async () => {
    const { rpc, adminRpc } = clientFor({ tier: "free", openrouter_token: null, openrouter_model: null }, {
      consume_free_capture: { data: [{ allowed: true }], error: null },
      refund_free_capture: { data: [{ refunded: true }], error: null },
    })
    processNote.mockRejectedValue(new Error("provider failed"))
    expect((await post()).status).toBe(500)
    expect(rpc).toHaveBeenCalledWith("consume_free_capture")
    expect(adminRpc).toHaveBeenCalledWith("refund_free_capture", { p_user_id: "user-1" })
    expect(adminRpc).toHaveBeenCalledTimes(1)
  })

  it("preserves the ProcessNoteError when refund RPC fails", async () => {
    const { adminRpc } = clientFor({ tier: "free", openrouter_token: null, openrouter_model: null }, {
      consume_free_capture: { data: [{ allowed: true }], error: null },
      refund_free_capture: { data: null, error: { code: "42501", message: "refund denied" } },
    })
    const original = new (await import("@/lib/ai/process-note")).ProcessNoteError("provider rejected", 422)
    processNote.mockRejectedValue(original)

    const response = await post()
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: "provider rejected" })
    expect(adminRpc).toHaveBeenCalledTimes(1)
  })

  it("preserves the original error when creating the admin client throws", async () => {
    clientFor({ tier: "free", openrouter_token: null, openrouter_model: null }, {
      consume_free_capture: { data: [{ allowed: true }], error: null },
    })
    createAdminClient.mockImplementation(() => { throw new Error("admin unavailable") })
    const original = new (await import("@/lib/ai/process-note")).ProcessNoteError("provider rejected", 409)
    processNote.mockRejectedValue(original)

    const response = await post()
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: "provider rejected" })
  })

  it("does not refund when free consumption is denied", async () => {
    const { adminRpc } = clientFor({ tier: "free", openrouter_token: null, openrouter_model: null }, {
      consume_free_capture: { data: [{ allowed: false }], error: null },
    })
    const response = await post()
    expect(response.status).toBe(429)
    expect(adminRpc).not.toHaveBeenCalled()
    expect(processNote).not.toHaveBeenCalled()
  })

  it("does not refund when free consumption fails", async () => {
    const { adminRpc } = clientFor({ tier: "free", openrouter_token: null, openrouter_model: null }, {
      consume_free_capture: { data: null, error: { code: "40001" } },
    })
    const response = await post()
    expect(response.status).toBe(500)
    expect(adminRpc).not.toHaveBeenCalled()
    expect(processNote).not.toHaveBeenCalled()
  })

  it("does not refund successful free processing", async () => {
    const { adminRpc } = clientFor({ tier: "free", openrouter_token: null, openrouter_model: null }, {
      consume_free_capture: { data: [{ allowed: true }], error: null },
    })
    expect((await post()).status).toBe(200)
    expect(adminRpc).not.toHaveBeenCalled()
  })

  it("never consumes or refunds OpenRouter processing", async () => {
    const { rpc, adminRpc } = clientFor({ tier: "openrouter", openrouter_token: "ciphertext", openrouter_model: "openai/gpt-5-nano" })
    expect((await post()).status).toBe(200)
    expect(rpc).not.toHaveBeenCalled()
    expect(adminRpc).not.toHaveBeenCalled()
  })
})
