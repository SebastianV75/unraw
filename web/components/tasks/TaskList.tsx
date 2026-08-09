"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LoadingButton } from "@/components/interior/loading-button"
import type { Task, TaskStatus } from "@/types"
import posthog from "posthog-js"

const statusLabels: Record<TaskStatus, string> = { pending: "Pending", in_progress: "In progress", done: "Done" }

type TaskListProps = {
  tasks: Task[]
  onStatusChanged: (task: Task) => void
  onDeleted: (id: string) => void
}

export default function TaskList({ tasks, onStatusChanged, onDeleted }: TaskListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function changeStatus(task: Task, status: TaskStatus) {
    setBusyId(task.id)
    setError("")
    const { data, error } = await createClient().from("tasks").update({ status }).eq("id", task.id).eq("user_id", task.user_id).select("*").single()
    if (!error && data) { posthog.capture("task_status_changed", { status }); onStatusChanged(data as Task) }
    else setError("We could not update the task status. Please try again.")
    setBusyId(null)
  }

  function startEditing(task: Task) {
    setEditingId(task.id)
    setTitle(task.title)
    setNotes(task.notes ?? "")
    setDueDate(task.due_date ?? "")
    setError("")
  }

  async function updateTask(task: Task) {
    const cleanTitle = title.trim()
    if (!cleanTitle) { setError("A task title is required."); return }
    setBusyId(task.id)
    setError("")
    const { data, error: updateError } = await createClient().from("tasks").update({ title: cleanTitle, notes: notes.trim() || null, due_date: dueDate || null }).eq("id", task.id).eq("user_id", task.user_id).select("*").single()
    if (updateError || !data) setError("We could not update the task. Please try again.")
    else { onStatusChanged(data as Task); setEditingId(null) }
    setBusyId(null)
  }

  async function remove(task: Task) {
    if (!window.confirm("Delete this task?")) return
    setBusyId(task.id)
    setError("")
    const { error: deleteError } = await createClient().from("tasks").delete().eq("id", task.id).eq("user_id", task.user_id)
    if (deleteError) setError("We could not delete the task. Please try again.")
    else onDeleted(task.id)
    setBusyId(null)
  }

  if (tasks.length === 0) return <p className="rounded-box border border-dashed border-base-300 p-6 text-center text-base-content/60">No tasks yet.</p>

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-error" role="alert">{error}</p>}
      {tasks.map((task) => (
        <article className="rounded-box border border-base-300 bg-base-100 p-4" key={task.id}>
          {editingId === task.id ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void updateTask(task) }}>
            <input className="input input-bordered w-full" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} aria-label="Task title" />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input className="input input-bordered w-full" placeholder="Notes (optional)" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} /><input className="input input-bordered" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Due date" /></div>
            <div className="flex gap-2"><LoadingButton className="btn btn-primary btn-sm" onAction={() => updateTask(task)} pendingLabel="Saving..." disabled={busyId === task.id}>Save</LoadingButton><button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingId(null)} disabled={busyId === task.id}>Cancel</button></div>
          </form> : <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className={task.status === "done" ? "font-medium line-through opacity-60" : "font-medium"}>{task.title}</h3>
              {task.notes && <p className="mt-1 text-sm text-base-content/70">{task.notes}</p>}
              {task.due_date && <p className="mt-2 text-xs text-base-content/60">Due {task.due_date}</p>}
            </div>
            <select className="select select-bordered select-sm" value={task.status} disabled={busyId === task.id} onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)} aria-label={`Status for ${task.title}`}>
              {(Object.keys(statusLabels) as TaskStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </div>}
          {editingId !== task.id && <div className="mt-3 flex gap-2"><button className="btn btn-ghost btn-sm" type="button" onClick={() => startEditing(task)} disabled={busyId === task.id}>Edit</button><button className="btn btn-ghost btn-sm text-error" type="button" onClick={() => void remove(task)} disabled={busyId === task.id}>Delete</button></div>}
        </article>
      ))}
    </div>
  )
}
