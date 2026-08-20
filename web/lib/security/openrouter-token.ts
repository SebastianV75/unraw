import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function decodeBase64(value: string, label: string) {
  if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new Error(`Invalid ${label}.`)
  }
  const decoded = Buffer.from(value, "base64")
  if (decoded.length === 0 || decoded.toString("base64") !== value) {
    throw new Error(`Invalid ${label}.`)
  }
  return decoded
}

function decodeBase64Url(value: string, label: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error(`Invalid ${label}.`)
  const decoded = Buffer.from(value, "base64url")
  if (decoded.length === 0 || decoded.toString("base64url") !== value) {
    throw new Error(`Invalid ${label}.`)
  }
  return decoded
}

function encryptionKey() {
  const value = process.env.OPENROUTER_TOKEN_ENCRYPTION_KEY
  if (!value) throw new Error("OpenRouter token encryption is not configured.")

  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(value)) key = Buffer.from(value, "hex")
  else key = decodeBase64(value, "OpenRouter token encryption key")
  if (key.length !== 32) throw new Error("OpenRouter token encryption is not configured.")
  return key
}

export function encryptOpenRouterToken(token: string) {
  if (!token.trim()) throw new Error("OpenRouter token cannot be empty.")
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".")
}

export function decryptOpenRouterToken(value: string) {
  const parts = value.split(".")
  if (parts.length !== 3) throw new Error("Invalid encrypted token.")

  const [iv, authTag, encrypted] = parts.map((part) => decodeBase64Url(part, "encrypted token"))
  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH || encrypted.length === 0) {
    throw new Error("Invalid encrypted token.")
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}
