import { describe, expect, it } from "vitest"
import { DEFAULT_OPENROUTER_MODEL, FREE_MODEL } from "./models"

it("keeps provider model defaults distinct", () => {
  expect(FREE_MODEL).toBe("gpt-4o-mini")
  expect(DEFAULT_OPENROUTER_MODEL).toBe("openai/gpt-5-nano")
})
