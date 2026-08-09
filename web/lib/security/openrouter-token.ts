import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function encryptionKey() {
  const value = process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY
  if (!value) throw new Error("OpenRouter token encryption is not configured.")

  const key = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64")
  if (key.length !== 32) throw new Error("OpenRouter token encryption is not configured.")
  return key
}

export function encryptOpenRouterToken(token: string) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".")
}

export function decryptOpenRouterToken(value: string) {
  const parts = value.split(".")
  if (parts.length !== 3) throw new Error("Invalid encrypted token.")

  const [iv, authTag, encrypted] = parts.map((part) => Buffer.from(part, "base64url"))
  if (iv.length !== IV_LENGTH || authTag.length !== 16 || encrypted.length === 0) throw new Error("Invalid encrypted token.")

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
