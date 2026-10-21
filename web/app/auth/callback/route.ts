import { getPublicEnv } from "@/lib/public-env";
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSafeNextPath } from "@/lib/utils"

export async function GET(request: NextRequest) {
  // A reverse proxy may expose an internal container address in request.url.
  const appUrl = getPublicEnv("NEXT_PUBLIC_APP_URL") || request.nextUrl.origin
  const code = request.nextUrl.searchParams.get("code")
  const next = getSafeNextPath(request.nextUrl.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=callback", appUrl))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL("/login?error=callback", appUrl))
  }

  return NextResponse.redirect(new URL(next, appUrl))
}
