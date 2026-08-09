"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Area, SecondBrainEntry } from "@/types"

export default function SecondBrainPage() {
  const [entries, setEntries] = useState<SecondBrainEntry[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [areaId, setAreaId] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: "", content: "", tags: "" })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Your session has expired. Please sign in again."); setLoading(false); return }
      const [areaResult, entryResult] = await Promise.all([
        supabase.from("areas").select("*").eq("user_id", user.id).order("name"),
        supabase.from("second_brain").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ])
      if (areaResult.error || entryResult.error) setError("We could not load your second brain.")
      setAreas((areaResult.data ?? []) as Area[]); setEntries((entryResult.data ?? []) as SecondBrainEntry[])
      setLoading(false)
    }
    void load()
  }, [])

  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim(); const cleanContent = content.trim()
    if (!cleanTitle || !cleanContent || !areaId) { setError("Title, content, and area are required."); return }
    setSaving(true); setError("")
    const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Your session has expired. Please sign in again."); setSaving(false); return }
    const cleanTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20)
    const { data, error: insertError } = await supabase.from("second_brain").insert({ user_id: user.id, area_id: areaId, title: cleanTitle, content: cleanContent, tags: cleanTags }).select("*").single()
    if (insertError || !data) setError("We could not create the entry.")
    else { setEntries((current) => [data as SecondBrainEntry, ...current]); setTitle(""); setContent(""); setTags("") }
    setSaving(false)
  }

  async function deleteEntry(entry: SecondBrainEntry) {
    if (!window.confirm("Delete this entry?")) return
    const { error: deleteError } = await createClient().from("second_brain").delete().eq("id", entry.id).eq("user_id", entry.user_id)
    if (deleteError) setError("We could not delete the entry.")
    else setEntries((current) => current.filter((item) => item.id !== entry.id))
  }

  function startEditing(entry: SecondBrainEntry) {
    setEditingId(entry.id)
    setDraft({ title: entry.title, content: entry.content, tags: entry.tags.join(", ") })
    setError("")
  }

  async function updateEntry(event: FormEvent<HTMLFormElement>, entry: SecondBrainEntry) {
    event.preventDefault()
    const cleanTitle = draft.title.trim()
    const cleanContent = draft.content.trim()
    if (!cleanTitle || !cleanContent) { setError("Title and content are required."); return }
    setSaving(true); setError("")
    const cleanTags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20)
    const { data, error: updateError } = await createClient().from("second_brain").update({ title: cleanTitle, content: cleanContent, tags: cleanTags }).eq("id", entry.id).eq("user_id", entry.user_id).select("*").single()
    if (updateError || !data) setError("We could not update the entry. Please try again.")
    else { setEntries((current) => current.map((item) => item.id === entry.id ? data as SecondBrainEntry : item)); setEditingId(null) }
    setSaving(false)
  }

  const areaNames = new Map(areas.map((area) => [area.id, area.name]))
  return <div className="mx-auto max-w-5xl space-y-8">
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Knowledge library</p><h1 className="mt-2 text-4xl font-bold">Second Brain</h1><p className="mt-2 text-base-content/70">Keep useful concepts, learnings, and notes connected to an area.</p></header>
    <form className="space-y-3 rounded-box border border-base-300 bg-base-100 p-5" onSubmit={createEntry}><div className="grid gap-3 md:grid-cols-2"><input className="input input-bordered" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} /><select className="select select-bordered" value={areaId} onChange={(event) => setAreaId(event.target.value)} aria-label="Area"><option value="">Select an area</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div><textarea className="textarea textarea-bordered min-h-32 w-full" placeholder="Content" value={content} onChange={(event) => setContent(event.target.value)} maxLength={10000} /><input className="input input-bordered w-full" placeholder="Tags, comma separated (optional)" value={tags} onChange={(event) => setTags(event.target.value)} maxLength={500} />{error && <p className="text-sm text-error" role="alert">{error}</p>}<button className="btn btn-primary" type="submit" disabled={saving || areas.length === 0}>{saving ? "Creating..." : "Add entry"}</button></form>
     {loading ? <p>Loading your second brain...</p> : entries.length === 0 ? <div className="rounded-box border border-dashed border-base-300 p-10 text-center"><h2 className="text-xl font-semibold">No entries yet</h2><p className="mt-2 text-base-content/60">Add a note above to start building your knowledge library.</p></div> : <div className="space-y-4">{entries.map((entry) => <article className="rounded-box border border-base-300 bg-base-100 p-5" key={entry.id}>{editingId === entry.id ? <form className="space-y-3" onSubmit={(event) => void updateEntry(event, entry)}><input className="input input-bordered w-full" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={200} aria-label="Entry title" /><textarea className="textarea textarea-bordered min-h-32 w-full" value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} maxLength={10000} /><input className="input input-bordered w-full" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} maxLength={500} placeholder="Tags, comma separated (optional)" /><div className="flex gap-2"><button className="btn btn-primary btn-sm" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingId(null)} disabled={saving}>Cancel</button></div></form> : <><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{entry.title}</h2><Link className="mt-1 inline-block text-sm text-primary" href={`/areas/${entry.area_id}`}>{areaNames.get(entry.area_id) ?? "Unknown area"}</Link></div><div className="flex gap-2"><button className="btn btn-ghost btn-sm" type="button" onClick={() => startEditing(entry)}>Edit</button><button className="btn btn-ghost btn-sm text-error" type="button" onClick={() => void deleteEntry(entry)}>Delete</button></div></div><p className="mt-4 whitespace-pre-wrap text-base-content/80">{entry.content}</p>{entry.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{entry.tags.map((tag) => <span className="badge badge-outline" key={tag}>{tag}</span>)}</div>}</>}</article>)}</div>}
  </div>
}
