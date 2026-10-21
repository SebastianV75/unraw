import { afterEach, describe, expect, it, vi } from "vitest"
import { Webhook } from "svix"
import { POST } from "./route"

const secret = `whsec_${Buffer.from("unraw-test-webhook-secret").toString("base64")}`
const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "email-1" } })

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("Resend webhook", () => {
  it("rejects unsigned production events when the secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const response = await POST(new Request("http://test", { method: "POST", body: payload }))
    expect(response.status).toBe(503)
  })

  it("accepts a correctly signed event", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("RESEND_WEBHOOK_SECRET", secret)
    vi.spyOn(console, "log").mockImplementation(() => {})
    const timestamp = new Date()
    const id = "msg_test"
    const signature = new Webhook(secret).sign(id, timestamp, payload)
    const response = await POST(new Request("http://test", {
      method: "POST", body: payload,
      headers: { "svix-id": id, "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)), "svix-signature": signature },
    }))
    expect(response.status).toBe(200)
  })

  it("rejects invalid signatures", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", secret)
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect((await POST(new Request("http://test", { method: "POST", body: payload }))).status).toBe(401)
  })

  it.each(["{", "null", "{}"])("rejects malformed development events: %s", async (body) => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    vi.spyOn(console, "warn").mockImplementation(() => {})
    expect((await POST(new Request("http://test", { method: "POST", body }))).status).toBe(400)
  })
})
