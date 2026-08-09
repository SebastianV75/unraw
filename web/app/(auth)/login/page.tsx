"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getSafeNextPath } from "@/lib/utils"
import { InlineValidation } from "@/components/interior/inline-validation"
import { LoadingButton } from "@/components/interior/loading-button"
import posthog from "posthog-js"

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(searchParams.get("error") ? "Authentication failed. Please try again." : "")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!/\S+@\S+\.\S+/.test(email) || !password) {
      setError("Enter a valid email and password.")
      return
    }
    setLoading(true)
    setError("")

    const { error: authError } = await createClient().auth.signInWithPassword({ email, password })
    if (authError) {
      setError("Unable to sign in with those credentials.")
      setLoading(false)
      return
    }

    posthog.capture("user_signed_in", { sign_in_method: "password" })
    window.location.assign(getSafeNextPath(searchParams.get("next")))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-4 py-12">
      <section className="w-full max-w-md rounded-box bg-base-100 p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Unraw</p>
          <h1 className="mb-2 text-3xl font-bold">Welcome back</h1>
          <p className="mb-8 text-base-content/70">Sign in to continue organizing your ideas.</p>
         <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleSubmit() }}>
           <InlineValidation label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} validate={(value) => /\S+@\S+\.\S+/.test(value) ? null : "Enter a valid email address."} />
           <InlineValidation label="Password" type="password" autoComplete="current-password" required value={password} onChange={setPassword} validate={(value) => value ? null : "Enter your password."} />
           {error && <p className="text-sm text-error" role="alert">{error}</p>}
           <LoadingButton className="btn btn-primary w-full" onAction={handleSubmit} pendingLabel="Signing in..." disabled={loading}>Sign in</LoadingButton>
         </form>
         <p className="mt-6 text-center text-sm text-base-content/70">
            No account yet? <Link className="link link-primary" href={`/register?next=${encodeURIComponent(getSafeNextPath(searchParams.get("next")))}`}>Create one</Link>
        </p>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
