import { describe, expect, it } from "vitest"
import { DEFAULT_OPENROUTER_MODEL, FREE_MODEL } from "./models"

it("keeps free and OpenRouter model defaults aligned", () => {
  expect(DEFAULT_OPENROUTER_MODEL).toBe("openai/gpt-5-nano")
  expect(FREE_MODEL).toBe("gpt-5-nano")
})
