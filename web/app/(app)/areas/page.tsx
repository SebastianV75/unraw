"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Area } from "@/types"
import { LoadingButton } from "@/components/interior/loading-button"
import { SkeletonSwap } from "@/components/interior/skeleton-swap"

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadAreas() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Your session has expired. Please sign in again."); setLoading(false); return }
    const { data, error: fetchError } = await supabase.from("areas").select("*").eq("user_id", user.id).order("created_at")
    if (fetchError) setError("We could not load your areas.")
    else setAreas((data ?? []) as Area[])
    setLoading(false)
  }

  useEffect(() => { void loadAreas() }, [])

  async function createArea() {
    const cleanName = name.trim()
    if (!cleanName) { setError("An area name is required."); return }
    setSaving(true); setError("")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: insertError } = user ? await supabase.from("areas").insert({ user_id: user.id, name: cleanName }).select("*").single() : { data: null, error: new Error("No user") }
    if (insertError || !data) setError("We could not create the area. Please try again.")
    else { setAreas((current) => [...current, data as Area]); setName("") }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Your system</p><h1 className="mt-2 text-4xl font-bold">Areas</h1><p className="mt-2 text-base-content/70">Keep your work and life organized around the things that matter.</p></header>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void createArea() }}><input className="input input-bordered flex-1" placeholder="New area name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /><LoadingButton className="btn btn-primary" onAction={createArea} pendingLabel="Creating..." disabled={saving || !name.trim()}>Create area</LoadingButton></form>
      {error && <p className="text-sm text-error" role="alert">{error}</p>}
      <SkeletonSwap ready={!loading} lines={5} reserve={260} label="Areas">
        {!loading ? areas.length === 0 ? <div className="rounded-box border border-dashed border-base-300 p-10 text-center"><h2 className="text-xl font-semibold">No areas yet</h2><p className="mt-2 text-base-content/60">Create your first area to start building your system.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{areas.map((area) => <Link className="rounded-box border border-base-300 bg-base-100 p-5 transition hover:border-primary hover:shadow-md" href={`/areas/${area.id}`} key={area.id}><h2 className="text-xl font-semibold">{area.name}</h2><p className="mt-2 text-sm text-base-content/60">Open area</p></Link>)}</div> : null}
      </SkeletonSwap>
    </div>
  )
}
