"use client"

import { FormEvent, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Idea } from "@/types"

export default function IdeaForm({ areaId, onCreated }: { areaId: string; onCreated: (idea: Idea) => void }) {
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanContent = content.trim()
    if (!cleanContent) { setError("Idea content is required."); return }
    setSaving(true); setError("")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Your session has expired. Please sign in again."); setSaving(false); return }
    const { data, error: insertError } = await supabase.from("ideas").insert({ user_id: user.id, area_id: areaId, content: cleanContent, status: "new" }).select("*").single()
    if (insertError || !data) setError("We could not create the idea.")
    else { onCreated(data as Idea); setContent("") }
    setSaving(false)
  }

  return <form className="space-y-3" onSubmit={submit}>
    <textarea className="textarea textarea-bordered min-h-24 w-full" placeholder="Capture an idea" value={content} onChange={(event) => setContent(event.target.value)} maxLength={4000} />
    {error && <p className="text-sm text-error" role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Creating..." : "Add idea"}</button>
  </form>
}
