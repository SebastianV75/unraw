import { afterEach, describe, expect, it } from "vitest"
import { decryptOpenRouterToken, encryptOpenRouterToken } from "./openrouter-token"

const KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

afterEach(() => {
  delete process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY
})

describe("OpenRouter token encryption", () => {
  it("round-trips without exposing the plaintext in the ciphertext", () => {
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = KEY
    const token = "sk-or-v1-test-secret-value"
    const encrypted = encryptOpenRouterToken(token)

    expect(encrypted).not.toContain(token)
    expect(decryptOpenRouterToken(encrypted)).toBe(token)
  })

  it.each([undefined, "not-a-key", "00"]) ("rejects an absent or invalid key: %s", (key) => {
    if (key) process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = key
    expect(() => encryptOpenRouterToken("sk-or-v1-test-secret")).toThrow()
  })

  it("rejects a wrong key", () => {
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = KEY
    const encrypted = encryptOpenRouterToken("sk-or-v1-test-secret")
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    expect(() => decryptOpenRouterToken(encrypted)).toThrow()
  })

  it.each([
    "",
    "not-an-envelope",
    "a.b.c.d",
    "!!!!.!!!!.!!!!",
  ])("rejects malformed envelopes: %s", (value) => {
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = KEY
    expect(() => decryptOpenRouterToken(value)).toThrow()
  })

  it("rejects malformed IV, tag, and ciphertext base64url parts", () => {
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = KEY
    const [iv, tag, ciphertext] = encryptOpenRouterToken("sk-or-v1-test-secret").split(".")
    expect(() => decryptOpenRouterToken([iv.slice(1), tag, ciphertext].join("."))).toThrow()
    expect(() => decryptOpenRouterToken([iv, tag.slice(1), ciphertext].join("."))).toThrow()
    expect(() => decryptOpenRouterToken([iv, tag, `${ciphertext}=`].join("."))).toThrow()
  })

  it("rejects a manipulated auth tag with a valid length", () => {
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = KEY
    const parts = encryptOpenRouterToken("sk-or-v1-test-secret").split(".")
    parts[1] = `${parts[1].slice(0, -1)}${parts[1].endsWith("A") ? "B" : "A"}`

    expect(parts[1]).toHaveLength(22)
    expect(() => decryptOpenRouterToken(parts.join("."))).toThrow()
  })

  it("rejects manipulated ciphertext", () => {
    process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY = KEY
    const parts = encryptOpenRouterToken("sk-or-v1-test-secret").split(".")
    parts[2] = `${parts[2].slice(0, -1)}${parts[2].endsWith("A") ? "B" : "A"}`

    expect(() => decryptOpenRouterToken(parts.join("."))).toThrow()
  })
})
