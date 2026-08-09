"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import Inbox from "reicon-react/icons/Inbox"
import ArrowRight4 from "reicon-react/icons/ArrowRight4"
import { createClient } from "@/lib/supabase/client"
import type { Area, InboxItem, ProfileView, Project, Task, TaskStatus } from "@/types"
import { SegmentedControl } from "@/components/interior/segmented-control"
import { SkeletonSwap } from "@/components/interior/skeleton-swap"

const taskColumns: { status: TaskStatus; label: string }[] = [
  { status: "pending", label: "Pendientes" },
  { status: "in_progress", label: "En curso" },
  { status: "done", label: "Hechas" },
]

export default function OverviewPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
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
        setError("Tu sesión terminó. Vuelve a entrar para continuar.")
        setLoading(false)
        return
      }
      const [profileResult, areaResult, projectResult, taskResult, inboxResult] = await Promise.all([
        supabase.from("profiles").select("preferred_view").eq("id", user.id).single(),
        supabase.from("areas").select("*").eq("user_id", user.id).order("name"),
        supabase.from("projects").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("inbox_items").select("*").eq("needs_home", true).order("created_at", { ascending: false }),
      ])
      if (profileResult.error) setError("No pudimos cargar tu preferencia de vista.")
      else if (profileResult.data?.preferred_view === "list" || profileResult.data?.preferred_view === "kanban") setView(profileResult.data.preferred_view)
      if (areaResult.error || projectResult.error || taskResult.error || inboxResult.error) setError("No pudimos cargar tu resumen.")
      setAreas((areaResult.data ?? []) as Area[])
      setProjects((projectResult.data ?? []) as Project[])
      setTasks((taskResult.data ?? []) as Task[])
      setInbox((inboxResult.data ?? []) as InboxItem[])
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
    const { error: updateError } = user ? await supabase.from("profiles").update({ preferred_view: nextView }).eq("id", user.id) : { error: new Error("No user") }
    if (updateError) {
      setView(previousView)
      setError("No pudimos guardar la vista. Restauramos la anterior.")
    }
    setSavingView(false)
  }

  const filteredTasks = useMemo(() => tasks.filter((task) => task.status !== "done" && (status === "all" || task.status === status) && (areaId === "all" || task.area_id === areaId)), [tasks, status, areaId])
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
    return <article className="overview-card" key={task.id}>
      <div className="flex justify-between gap-3"><h3 className="font-medium">{task.title}</h3><span className="overview-meta">{task.status === "in_progress" ? "En curso" : "Pendiente"}</span></div>
      <p className="mt-2 overview-meta">{areaNames.get(task.area_id) ?? "Sin área"}{task.due_date ? ` · ${task.due_date}` : ""}</p>
    </article>
  }

  return <div className="overview-page mx-auto max-w-6xl space-y-10">
    <header className="overview-header"><div><p className="overview-label">Resumen</p><h1>Hoy</h1><p className="overview-lead">Un lugar tranquilo para ver lo que importa ahora.</p></div><Link className="overview-primary-action" href="/capture">Capturar <ArrowRight4 size={16} color="currentColor" weight="Outline" strokeWidth={1.7} /></Link></header>
    {error && <p className="overview-alert" role="alert">{error}</p>}
    <SkeletonSwap ready={!loading} lines={8} reserve={420} label="Resumen">
      {!loading ? <>
        <section className="space-y-4"><div className="overview-section-heading"><div><p className="overview-label">Para ahora</p><h2>Tareas pendientes</h2><p>Solo lo necesario para seguir avanzando. No hace falta hacerlo todo.</p></div><div className="flex flex-wrap gap-2"><SegmentedControl label="Vista de tareas" value={view} onValueChange={(next) => void changeView(next as ProfileView)} options={[{ value: "list", label: "Lista", disabled: savingView }, { value: "kanban", label: "Tablero", disabled: savingView }]} />{view === "list" && <select className="overview-select" value={status} onChange={(event) => setStatus(event.target.value as "all" | TaskStatus)} aria-label="Filtrar tareas por estado"><option value="all">Todos los estados</option><option value="pending">Pendientes</option><option value="in_progress">En curso</option></select>}<select className="overview-select" value={areaId} onChange={(event) => setAreaId(event.target.value)} aria-label="Filtrar tareas por área"><option value="all">Todas las áreas</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></div></div>
          {view === "list" ? (filteredTasks.length === 0 ? <p className="overview-empty">No hay tareas pendientes con estos filtros. Puedes respirar.</p> : <div className="grid gap-3 md:grid-cols-2">{filteredTasks.map(renderTask)}</div>) : <div className="grid gap-4 lg:grid-cols-3">{taskColumns.map((column) => { const columnTasks = kanbanTasks.filter((task) => task.status === column.status); return <section className="overview-column" key={column.status}><div className="flex items-center justify-between"><h3>{column.label}</h3><span className="overview-meta">{columnTasks.length}</span></div>{columnTasks.length === 0 ? <p className="overview-meta mt-4">Nada aquí.</p> : <div className="mt-3 space-y-3">{columnTasks.map(renderTask)}</div>}</section> })}</div>}
        </section>
        {inbox.length > 0 && <section className="overview-inbox"><div className="overview-section-heading"><div><p className="overview-label">Sin clasificar</p><h2>Inbox</h2><p>Algunas capturas esperan un lugar. Revísalas cuando tengas espacio.</p></div><Inbox size={22} color="currentColor" weight="Outline" strokeWidth={1.6} /></div><div className="mt-4 space-y-2">{inbox.slice(0, 3).map((item) => <Link className="overview-inbox-item" href="/inbox" key={item.id}><span>{item.title ?? item.content}</span><ArrowRight4 size={16} color="currentColor" weight="Outline" strokeWidth={1.7} /></Link>)}</div>{inbox.length > 3 && <Link className="overview-text-link" href="/inbox">Ver las {inbox.length} capturas <ArrowRight4 size={14} color="currentColor" weight="Outline" strokeWidth={1.7} /></Link>}</section>}
        <section className="space-y-4"><div><p className="overview-label">En marcha</p><h2>Proyectos activos</h2><p>Un vistazo al progreso, sin presión.</p></div>{projectProgress.length === 0 ? <p className="overview-empty">Todavía no hay proyectos activos.</p> : <div className="grid gap-4 md:grid-cols-2">{projectProgress.map(({ project, progress }) => { const percentage = progress.total ? Math.round(progress.completed / progress.total * 100) : 0; return <Link className="overview-card overview-project" href={`/areas/${project.area_id}/projects/${project.id}`} key={project.id}><div className="flex justify-between gap-3"><h3 className="font-medium">{project.name}</h3><span className="overview-meta">{percentage}%</span></div><p className="mt-1 overview-meta">{areaNames.get(project.area_id) ?? "Sin área"}</p><progress className="progress progress-primary mt-4 w-full" value={percentage} max="100" /><p className="mt-2 overview-meta">{progress.completed} de {progress.total} tareas completadas</p></Link> })}</div>}</section>
      </> : null}
    </SkeletonSwap>
  </div>
}
