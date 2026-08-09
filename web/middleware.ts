import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = [
  "/overview",
  "/capture",
  "/areas",
  "/second-brain",
  "/settings",
]

function hasPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie))
  return to
}

function redirectWithCookies(response: NextResponse, request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return copyCookies(response, NextResponse.redirect(url))
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname
  const isAppRoute = PROTECTED_PREFIXES.some((prefix) => hasPath(pathname, prefix))
  const isOnboarding = pathname === "/onboarding"
  const isProtected = isAppRoute || isOnboarding

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Keep this immediately after client creation so SSR cookies stay in sync.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
    return copyCookies(response, NextResponse.redirect(loginUrl))
  }

  if (!user) return response

  if (!isProtected) return response

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle()

  const onboardingCompleted = profile?.onboarding_completed === true

  if (isOnboarding && onboardingCompleted) {
    return redirectWithCookies(response, request, "/overview")
  }

  if (isAppRoute && !onboardingCompleted) {
    return redirectWithCookies(response, request, "/onboarding")
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/ai/process-note(?:/|$)).*)",
  ],
}
