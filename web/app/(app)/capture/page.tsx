"use client"

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Area, CaptureOutput, CaptureSuggestion, Project } from "@/types"

const suggestionKey = (suggestion: CaptureSuggestion) => `${suggestion.type}:${suggestion.name.toLowerCase()}`

export default function CapturePage() {
  const [rawNote, setRawNote] = useState("")
  const [areas, setAreas] = useState<Area[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [result, setResult] = useState<CaptureOutput | null>(null)
  const [approved, setApproved] = useState<Record<string, boolean>>({})
  const [projectAreas, setProjectAreas] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    async function loadContext() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Your session has expired. Please sign in again."); setLoading(false); return }
      const [areaResult, projectResult] = await Promise.all([
        supabase.from("areas").select("*").eq("user_id", user.id).order("name"),
        supabase.from("projects").select("*").eq("user_id", user.id).order("name"),
      ])
      if (areaResult.error || projectResult.error) setError("We could not load your system context.")
      setAreas((areaResult.data ?? []) as Area[])
      setProjects((projectResult.data ?? []) as Project[])
      setLoading(false)
    }
    void loadContext()
  }, [])

  const suggestions = useMemo(() => {
    if (!result) return []
    const all = [...result.suggestions]
    result.tasks.forEach((item) => {
      if (item.suggested_new_area) all.push({ type: "new_area", name: item.suggested_new_area, reason: "A task does not fit an existing area." })
      if (item.suggested_new_project) all.push({ type: "new_project", name: item.suggested_new_project, reason: "A task does not fit an existing project.", area_id: item.area_id })
    })
    result.ideas.forEach((item) => { if (item.suggested_new_area) all.push({ type: "new_area", name: item.suggested_new_area, reason: "An idea does not fit an existing area." }) })
    result.second_brain.forEach((item) => { if (item.suggested_new_area) all.push({ type: "new_area", name: item.suggested_new_area, reason: "A note does not fit an existing area." }) })
    return Array.from(new Map(all.map((item) => [suggestionKey(item), item])).values())
  }, [result])

  async function process(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (rawNote.trim().length < 1 || rawNote.trim().length > 12000) { setError("Write a note between 1 and 12,000 characters."); return }
    setProcessing(true); setError(""); setSuccess(""); setResult(null)
    try {
      const response = await fetch("/api/ai/process-note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw_note: rawNote }) })
      const body = await response.json() as CaptureOutput & { error?: string }
      if (!response.ok) throw new Error(body.error || "The note could not be processed.")
      setResult(body); setApproved({}); setProjectAreas({})
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The note could not be processed.") }
    setProcessing(false)
  }

  async function saveResults() {
    if (!result) return
    setSaving(true); setError(""); setSuccess("")
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Your session has expired. Please sign in again."); setSaving(false); return }

    const areaIds = new Set(areas.map((area) => area.id))
    const projectIds = new Set(projects.map((project) => project.id))
    const areaBySuggestion = new Map<string, string>()
    const projectBySuggestion = new Map<string, string>()
    let nextAreas = [...areas]
    let nextProjects = [...projects]

    for (const suggestion of suggestions.filter((item) => approved[suggestionKey(item)])) {
      if (suggestion.type === "new_area") {
        const { data, error: insertError } = await supabase.from("areas").insert({ user_id: user.id, name: suggestion.name }).select("*").single()
        if (insertError || !data) { setError("We could not create a confirmed area suggestion."); setSaving(false); return }
        areaIds.add(data.id); areaBySuggestion.set(suggestionKey(suggestion), data.id); nextAreas.push(data as Area)
      } else {
        const areaId = projectAreas[suggestionKey(suggestion)] && areaIds.has(projectAreas[suggestionKey(suggestion)]) ? projectAreas[suggestionKey(suggestion)] : suggestion.area_id && areaIds.has(suggestion.area_id) ? suggestion.area_id : ""
        if (!areaId) { setError(`Select an area for the new project "${suggestion.name}".`); setSaving(false); return }
        const { data, error: insertError } = await supabase.from("projects").insert({ user_id: user.id, area_id: areaId, name: suggestion.name, status: "active" }).select("*").single()
        if (insertError || !data) { setError("We could not create a confirmed project suggestion."); setSaving(false); return }
        projectIds.add(data.id); projectBySuggestion.set(suggestionKey(suggestion), data.id); nextProjects.push(data as Project)
      }
    }

    const findArea = (id: string | null, suggested: string | null) => {
      if (id && areaIds.has(id)) return id
      if (suggested) return areaBySuggestion.get(`new_area:${suggested.toLowerCase()}`) ?? null
      return null
    }
    const findProject = (id: string | null, suggested: string | null) => {
      if (id && projectIds.has(id)) return id
      if (suggested) return projectBySuggestion.get(`new_project:${suggested.toLowerCase()}`) ?? null
      return null
    }
    const taskRows = result.tasks.map((item) => ({ user_id: user.id, area_id: findArea(item.area_id, item.suggested_new_area), project_id: findProject(item.project_id, item.suggested_new_project), title: item.title, status: "pending" })).filter((item) => item.area_id)
    const ideaRows = result.ideas.map((item) => ({ user_id: user.id, area_id: findArea(item.area_id, item.suggested_new_area), content: item.content, status: "new" })).filter((item) => item.area_id)
    const brainRows = result.second_brain.map((item) => ({ user_id: user.id, area_id: findArea(item.area_id, item.suggested_new_area), title: item.title, content: item.content, tags: item.tags })).filter((item) => item.area_id)
    const inserts = [taskRows.length ? supabase.from("tasks").insert(taskRows) : null, ideaRows.length ? supabase.from("ideas").insert(ideaRows) : null, brainRows.length ? supabase.from("second_brain").insert(brainRows) : null].filter(Boolean)
    const insertResults = await Promise.all(inserts)
    if (insertResults.some((item) => item?.error)) setError("Some confirmed items could not be saved.")
    else { setAreas(nextAreas); setProjects(nextProjects); setSuccess("Confirmed items were saved to your system."); setResult(null); setRawNote("") }
    setSaving(false)
  }

  const areaNames = new Map(areas.map((area) => [area.id, area.name]))
  const projectNames = new Map(projects.map((project) => [project.id, project.name]))
  return <div className="mx-auto max-w-5xl space-y-8">
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Inbox to action</p><h1 className="mt-2 text-4xl font-bold">Capture</h1><p className="mt-2 text-base-content/70">Write it raw. Review the structure. Save only what you confirm.</p></header>
    <form className="space-y-4 rounded-box border border-base-300 bg-base-100 p-5 shadow-sm" onSubmit={process}>
      <label className="form-control"><span className="label-text mb-2 font-semibold">Raw note</span><textarea className="textarea textarea-bordered min-h-48 w-full text-base" placeholder="Everything on your mind, without organizing it first..." value={rawNote} onChange={(event) => setRawNote(event.target.value)} maxLength={12000} disabled={processing} /></label>
      <div className="flex items-center justify-between gap-4"><span className="text-sm text-base-content/60">{rawNote.length.toLocaleString()} / 12,000</span><button className="btn btn-primary" type="submit" disabled={processing || loading}>{processing ? "Organizing..." : "Organize"}</button></div>
    </form>
    {loading && <p>Loading your areas and projects...</p>}
    {error && <p className="rounded-box bg-error/10 p-4 text-sm text-error" role="alert">{error}</p>}
    {success && <p className="rounded-box bg-success/10 p-4 text-sm text-success" role="status">{success}</p>}
    {result && <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <CaptureGroup title="Tasks" icon="📌">{result.tasks.map((item, index) => <article className="rounded-box border border-base-300 p-4" key={`${item.title}-${index}`}><p className="font-medium">{item.title}</p><p className="mt-2 text-xs text-base-content/60">{areaNames.get(item.area_id ?? "") ?? item.suggested_new_area ?? "Needs an area"}{item.project_id && projectNames.get(item.project_id) ? ` / ${projectNames.get(item.project_id)}` : item.suggested_new_project ? ` / ${item.suggested_new_project}` : ""}</p></article>)}</CaptureGroup>
        <CaptureGroup title="Ideas" icon="💡">{result.ideas.map((item, index) => <article className="rounded-box border border-base-300 p-4" key={`${item.content}-${index}`}><p className="whitespace-pre-wrap">{item.content}</p><p className="mt-2 text-xs text-base-content/60">{areaNames.get(item.area_id ?? "") ?? item.suggested_new_area ?? "Needs an area"}</p></article>)}</CaptureGroup>
        <CaptureGroup title="Second Brain" icon="🧠">{result.second_brain.map((item, index) => <article className="rounded-box border border-base-300 p-4" key={`${item.title}-${index}`}><p className="font-medium">{item.title}</p><p className="mt-2 whitespace-pre-wrap text-sm text-base-content/80">{item.content}</p><p className="mt-2 text-xs text-base-content/60">{areaNames.get(item.area_id ?? "") ?? item.suggested_new_area ?? "Needs an area"}</p></article>)}</CaptureGroup>
      </section>
      {suggestions.length > 0 && <section className="space-y-4 rounded-box border border-warning/40 bg-warning/5 p-5"><div><h2 className="text-xl font-semibold">Suggestions to review</h2><p className="mt-1 text-sm text-base-content/70">Nothing here is created automatically. Confirm only what belongs in your system.</p></div>{suggestions.map((suggestion) => <div className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-4 sm:flex-row sm:items-center" key={suggestionKey(suggestion)}><label className="flex flex-1 gap-3"><input className="checkbox checkbox-primary mt-1" type="checkbox" checked={Boolean(approved[suggestionKey(suggestion)])} onChange={(event) => setApproved((current) => ({ ...current, [suggestionKey(suggestion)]: event.target.checked }))} /><span><strong>{suggestion.name}</strong><span className="block text-sm text-base-content/60">{suggestion.reason}</span></span></label>{suggestion.type === "new_project" && <select className="select select-bordered select-sm" value={projectAreas[suggestionKey(suggestion)] ?? suggestion.area_id ?? ""} onChange={(event) => setProjectAreas((current) => ({ ...current, [suggestionKey(suggestion)]: event.target.value }))} aria-label={`Area for ${suggestion.name}`}><option value="">Select area</option>{areas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}</select>}</div>)}</section>}
      <div className="flex justify-end"><button className="btn btn-primary" type="button" onClick={() => void saveResults()} disabled={saving}>{saving ? "Saving..." : "Save confirmed items"}</button></div>
    </div>}
  </div>
}

function CaptureGroup({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return <section className="space-y-3 rounded-box bg-base-100 p-4 shadow-sm"><h2 className="text-xl font-semibold">{icon} {title}</h2><div className="space-y-3">{children || <p className="text-sm text-base-content/60">Nothing identified.</p>}</div></section>
}
