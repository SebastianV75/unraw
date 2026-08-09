"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getSafeNextPath } from "@/lib/utils"

function RegisterForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    const { data, error: authError } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getSafeNextPath(searchParams.get("next")))}` },
    })

    if (authError) {
      setError("Unable to create the account. Please check your details and try again.")
      setLoading(false)
      return
    }

    if (data.session) {
      window.location.assign(getSafeNextPath(searchParams.get("next")))
      return
    }

    setMessage("Account created. Check your email to confirm your account before signing in.")
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-4 py-12">
      <section className="w-full max-w-md rounded-box bg-base-100 p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Unraw</p>
         <h1 className="mb-2 text-3xl font-bold">Crea tu cuenta</h1>
         <p className="mb-8 text-base-content/70">Empieza a ordenar todo lo que tienes en mente.</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="form-control w-full">
             <span className="label-text mb-2">Correo electrónico</span>
            <input className="input input-bordered w-full" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="form-control w-full">
             <span className="label-text mb-2">Contraseña</span>
            <input className="input input-bordered w-full" type="password" minLength={6} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="text-sm text-error" role="alert">{error}</p>}
          {message && <p className="text-sm text-success" role="status">{message}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
             {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-base-content/70">
           ¿Ya tienes cuenta? <Link className="link link-primary" href={`/login?next=${encodeURIComponent(getSafeNextPath(searchParams.get("next")))}`}>Iniciar sesión</Link>
        </p>
      </section>
    </main>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
