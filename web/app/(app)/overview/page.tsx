"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Area, ProfileView, Project, Task, TaskStatus } from "@/types"

const taskColumns: { status: TaskStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
]

export default function OverviewPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<ProfileView>("list")
  const [status, setStatus] = useState<"all" | TaskStatus>("all")
  const [areaId, setAreaId] = useState("all")
  const [loading, setLoading] = useState(true)
  const [savingView, setSavingView] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError("Your session has expired. Please sign in again.")
        setLoading(false)
        return
      }

      const [profileResult, areaResult, projectResult, taskResult] = await Promise.all([
        supabase.from("profiles").select("preferred_view").eq("id", user.id).single(),
        supabase.from("areas").select("*").eq("user_id", user.id).order("name"),
        supabase.from("projects").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }),
      ])

      if (profileResult.error) setError("We could not load your saved view preference.")
      else if (profileResult.data?.preferred_view === "list" || profileResult.data?.preferred_view === "kanban") setView(profileResult.data.preferred_view)
      if (areaResult.error || projectResult.error || taskResult.error) setError("We could not load your overview.")

      setAreas((areaResult.data ?? []) as Area[])
      setProjects((projectResult.data ?? []) as Project[])
      setTasks((taskResult.data ?? []) as Task[])
      setLoading(false)
    }

    void load()
  }, [])

  async function changeView(nextView: ProfileView) {
    if (nextView === view || savingView) return
    const previousView = view
    setView(nextView)
    setSavingView(true)
    setError("")

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: updateError } = user
      ? await supabase.from("profiles").update({ preferred_view: nextView }).eq("id", user.id)
      : { error: new Error("No user") }

    if (updateError) {
      setView(previousView)
      setError("We could not save your view preference. Your current view was restored.")
    }
    setSavingView(false)
  }

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.status !== "done" && (status === "all" || task.status === status) && (areaId === "all" || task.area_id === areaId)),
    [tasks, status, areaId],
  )
  const kanbanTasks = useMemo(() => tasks.filter((task) => areaId === "all" || task.area_id === areaId), [tasks, areaId])
  const areaNames = new Map(areas.map((area) => [area.id, area.name]))
  const taskCount = new Map<string, { total: number; completed: number }>()

  projects.forEach((project) => taskCount.set(project.id, { total: 0, completed: 0 }))
  tasks.forEach((task) => {
    if (task.project_id && taskCount.has(task.project_id)) {
      const count = taskCount.get(task.project_id)!
      count.total += 1
      if (task.status === "done") count.completed += 1
    }
  })
  const projectProgress = projects.map((project) => ({ project, progress: taskCount.get(project.id) ?? { total: 0, completed: 0 } }))

  function renderTask(task: Task) {
    return <article className="rounded-box border border-base-300 bg-base-100 p-4" key={task.id}>
      <div className="flex justify-between gap-3"><h3 className="font-semibold">{task.title}</h3><span className="badge badge-outline">{task.status}</span></div>
      <p className="mt-2 text-sm text-base-content/60">{areaNames.get(task.area_id) ?? "Unknown area"}{task.due_date ? ` · Due ${task.due_date}` : ""}</p>
    </article>
  }

  return <div className="mx-auto max-w-6xl space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Your system</p><h1 className="mt-2 text-4xl font-bold">Overview</h1><p className="mt-2 text-base-content/70">See what needs attention and keep moving.</p></div><Link className="btn btn-primary" href="/capture">Quick capture</Link></header>
    {error && <p className="text-sm text-error" role="alert">{error}</p>}
    {loading ? <p>Loading overview...</p> : <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">Tasks</h2><p className="text-base-content/60">Choose the view that works best for you.</p></div><div className="flex flex-wrap gap-2">
          <div className="join" role="group" aria-label="Choose task view"><button className={`btn btn-sm join-item ${view === "list" ? "btn-primary" : "btn-ghost"}`} onClick={() => void changeView("list")} disabled={savingView}>List</button><button className={`btn btn-sm join-item ${view === "kanban" ? "btn-primary" : "btn-ghost"}`} onClick={() => void changeView("kanban")} disabled={savingView}>Kanban</button></div>
          {view === "list" && <select className="select select-bordered select-sm" value={status} onChange={(event) => setStatus(event.target.value as "all" | TaskStatus)} aria-label="Filter tasks by status"><option value="all">All statuses</option><option value="pending">Pending</option><option value="in_progress">In progress</option></select>}
          <select className="select select-bordered select-sm" value={areaId} onChange={(event) => setAreaId(event.target.value)} aria-label="Filter tasks by area"><option value="all">All areas</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
        </div></div>
        {view === "list" ? (filteredTasks.length === 0 ? <p className="rounded-box border border-dashed border-base-300 p-6 text-base-content/60">No pending tasks match these filters.</p> : <div className="grid gap-3 md:grid-cols-2">{filteredTasks.map(renderTask)}</div>) : <div className="grid gap-4 lg:grid-cols-3">{taskColumns.map((column) => { const columnTasks = kanbanTasks.filter((task) => task.status === column.status); return <section className="space-y-3 rounded-box bg-base-200/50 p-4" key={column.status}><div className="flex items-center justify-between"><h3 className="font-semibold">{column.label}</h3><span className="badge badge-ghost">{columnTasks.length}</span></div>{columnTasks.length === 0 ? <p className="text-sm text-base-content/60">No tasks</p> : columnTasks.map(renderTask)}</section> })}</div>}
      </section>
      <section className="space-y-4"><div><h2 className="text-2xl font-semibold">Active projects</h2><p className="text-base-content/60">Progress based on completed tasks.</p></div>{projectProgress.length === 0 ? <p className="rounded-box border border-dashed border-base-300 p-6 text-base-content/60">No active projects yet.</p> : <div className="grid gap-4 md:grid-cols-2">{projectProgress.map(({ project, progress }) => { const percentage = progress.total ? Math.round(progress.completed / progress.total * 100) : 0; return <Link className="rounded-box border border-base-300 bg-base-100 p-5 hover:border-primary" href={`/areas/${project.area_id}/projects/${project.id}`} key={project.id}><div className="flex justify-between gap-3"><h3 className="font-semibold">{project.name}</h3><span className="text-sm font-semibold">{percentage}%</span></div><p className="mt-1 text-sm text-base-content/60">{areaNames.get(project.area_id) ?? "Unknown area"}</p><progress className="progress progress-primary mt-4 w-full" value={percentage} max="100" /><p className="mt-2 text-xs text-base-content/60">{progress.completed} of {progress.total} tasks completed</p></Link> })}</div>}</section>
    </>}
  </div>
}
