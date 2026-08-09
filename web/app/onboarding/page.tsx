"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type AreaDraft = { name: string; projects: string[] }

const initialAreas: AreaDraft[] = [
  { name: "", projects: [] },
  { name: "", projects: [] },
  { name: "", projects: [] },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [areas, setAreas] = useState(initialAreas)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function updateAreaName(index: number, value: string) {
    setAreas((current) => current.map((area, areaIndex) => areaIndex === index ? { ...area, name: value } : area))
  }

  function addProject(areaIndex: number) {
    setAreas((current) => current.map((area, index) => index === areaIndex ? { ...area, projects: [...area.projects, ""] } : area))
  }

  function updateProject(areaIndex: number, projectIndex: number, value: string) {
    setAreas((current) => current.map((area, index) => index === areaIndex
      ? { ...area, projects: area.projects.map((project, currentProjectIndex) => currentProjectIndex === projectIndex ? value : project) }
      : area))
  }

  function removeProject(areaIndex: number, projectIndex: number) {
    setAreas((current) => current.map((area, index) => index === areaIndex
      ? { ...area, projects: area.projects.filter((_, currentProjectIndex) => currentProjectIndex !== projectIndex) }
      : area))
  }

  function addArea() {
    if (areas.length < 5) setAreas((current) => [...current, { name: "", projects: [] }])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validAreas = areas.map((area) => ({ name: area.name.trim(), projects: area.projects.map((project) => project.trim()) }))
    if (validAreas.length < 3) {
      setError("Add at least three areas to continue.")
      return
    }
    if (validAreas.some((area) => !area.name)) {
      setError("Please add a name to every area before continuing.")
      return
    }
    if (validAreas.some((area) => area.projects.some((project) => !project))) {
      setError("Please add a name to every project before continuing.")
      return
    }
    if (validAreas.some((area) => {
      const projects = area.projects.map((project) => project.toLowerCase())
      return new Set(projects).size !== projects.length
    })) {
      setError("Project names must be unique within each area.")
      return
    }

    setLoading(true)
    setError("")
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError("Your session has expired. Please sign in again.")
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" })
    if (profileError) {
      setError("We could not prepare your profile. Please try again.")
      setLoading(false)
      return
    }

    const insertedAreas: { id: string }[] = []
    for (const area of validAreas) {
      const { data: insertedArea, error: areasError } = await supabase.from("areas").insert({ user_id: user.id, name: area.name }).select("id").single()
      if (areasError || !insertedArea) {
        setError("We could not save your areas. Please try again.")
        setLoading(false)
        return
      }
      insertedAreas.push(insertedArea)
    }

    const projects = validAreas.flatMap((area, index) => area.projects.map((project) => ({ user_id: user.id, area_id: insertedAreas[index].id, name: project })))
    if (projects.length > 0) {
      const { error: projectsError } = await supabase.from("projects").insert(projects)
      if (projectsError) {
        setError("Your areas were saved, but some projects could not be created. Please try again.")
        setLoading(false)
        return
      }
    }

    const { error: updateError } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id)
    if (updateError) {
      setError("Your setup was saved, but we could not finish onboarding. Please try again.")
      setLoading(false)
      return
    }

    router.replace("/overview")
  }

  return (
    <main className="min-h-screen bg-base-200 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-box bg-base-100 p-8 shadow-xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Unraw</p>
        <h1 className="text-3xl font-bold">Build your starting system</h1>
        <p className="mt-2 text-base-content/70">Choose three to five areas that matter to you. Add one or more active projects to any area.</p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {areas.map((area, index) => (
            <div className="rounded-box border border-base-300 p-4" key={index}>
              <label className="form-control">
                <span className="label-text mb-2">Area {index + 1}</span>
                <input className="input input-bordered" placeholder="Work, Health, Personal..." required value={area.name} onChange={(event) => updateAreaName(index, event.target.value)} />
              </label>
              <div className="mt-4 space-y-3">
                {area.projects.map((project, projectIndex) => (
                  <div className="flex gap-2" key={projectIndex}>
                    <input className="input input-bordered w-full" placeholder="Current project" aria-label={`Project ${projectIndex + 1} for area ${index + 1}`} value={project} onChange={(event) => updateProject(index, projectIndex, event.target.value)} />
                    <button className="btn btn-ghost" type="button" onClick={() => removeProject(index, projectIndex)}>Remove</button>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm" type="button" onClick={() => addProject(index)}>Add project</button>
              </div>
            </div>
          ))}
          {areas.length < 5 && <button className="btn btn-ghost" type="button" onClick={addArea}>+ Add another area</button>}
          {error && <p className="text-sm text-error" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>{loading ? "Saving your system..." : "Finish setup"}</button>
        </form>
      </section>
    </main>
  )
}
