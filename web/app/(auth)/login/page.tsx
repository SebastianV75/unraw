"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getSafeNextPath } from "@/lib/utils"

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(searchParams.get("error") ? "Authentication failed. Please try again." : "")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const { error: authError } = await createClient().auth.signInWithPassword({ email, password })
    if (authError) {
      setError("Unable to sign in with those credentials.")
      setLoading(false)
      return
    }

    window.location.assign(getSafeNextPath(searchParams.get("next")))
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-4 py-12">
      <section className="w-full max-w-md rounded-box bg-base-100 p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Unraw</p>
         <h1 className="mb-2 text-3xl font-bold">Bienvenido de nuevo</h1>
         <p className="mb-8 text-base-content/70">Inicia sesión para continuar organizando tus ideas.</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="form-control w-full">
             <span className="label-text mb-2">Correo electrónico</span>
            <input className="input input-bordered w-full" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="form-control w-full">
             <span className="label-text mb-2">Contraseña</span>
            <input className="input input-bordered w-full" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="text-sm text-error" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
             {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-base-content/70">
           ¿Aún no tienes cuenta? <Link className="link link-primary" href={`/register?next=${encodeURIComponent(getSafeNextPath(searchParams.get("next")))}`}>Crear cuenta</Link>
        </p>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
