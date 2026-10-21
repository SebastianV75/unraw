import { getPublicEnv } from "@/lib/public-env";
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = getPublicEnv("NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createBrowserClient(url, anonKey)
}
