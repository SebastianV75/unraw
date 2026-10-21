/** Only these explicitly public values may be sent to the browser. */
export const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;
type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type PublicEnv = Partial<Record<PublicEnvKey, string>>;

declare global {
  interface Window { __UNRAW_PUBLIC_ENV__?: PublicEnv }
}

// Keep variable lookup dynamic: Next.js must not freeze server values at build time.
export function getPublicEnv(name: PublicEnvKey): string | undefined {
  if (typeof window !== "undefined") return window.__UNRAW_PUBLIC_ENV__?.[name];
  return process.env[name];
}

export function publicEnvScript(): string {
  const config: PublicEnv = {};
  for (const key of PUBLIC_ENV_KEYS) config[key] = getPublicEnv(key);
  // Escape HTML script terminators and JS line separators, not just JSON quotes.
  const json = JSON.stringify(config)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.__UNRAW_PUBLIC_ENV__=${json};`;
}
