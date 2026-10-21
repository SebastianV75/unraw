import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const config = [
  { ignores: [".next/**", "out/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Defaults razonables para alumnos no técnicos — no romper builds por estilo
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
]

export default config
