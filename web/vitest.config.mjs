import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

const webRoot = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": webRoot,
    },
  },
})
