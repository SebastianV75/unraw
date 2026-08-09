import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"
import { processNoteOutputSchema } from "@/lib/ai/process-note"
import type { SaveCaptureInput, SaveCaptureResult } from "@/types"

const inputSchema = z.object({ idempotency_key: z.string().uuid(), raw_note: z.string().trim().min(1).max(12000), confirmed_output: processNoteOutputSchema, assignments: z.record(z.string(), z.string().uuid().nullable()) })

export async function saveCapture(body: unknown): Promise<SaveCaptureResult> {
  const input = inputSchema.parse(body) as SaveCaptureInput
  const user = await getUser()
  if (!user) throw new Error("Authentication is required.")
  const supabase = await createClient()
  const [{ data: areas }, { data: projects }] = await Promise.all([
    supabase.from("areas").select("id").eq("user_id", user.id),
    supabase.from("projects").select("id, area_id").eq("user_id", user.id),
  ])
  const areaIds = new Set((areas ?? []).map((item) => item.id))
  const projectAreas = new Map((projects ?? []).map((item) => [item.id, item.area_id]))
  const assignment = (key: string, fallback: string | null) =>
    Object.prototype.hasOwnProperty.call(input.assignments, key) ? input.assignments[key] : fallback
  const area = (kind: string, index: number, fallback: string | null) => {
    const selected = assignment(`${kind}:${index}`, fallback)
    return selected && areaIds.has(selected) ? selected : null
  }
  const project = (index: number, fallback: string | null, areaId: string | null) => {
    const selected = assignment(`task-project:${index}`, fallback)
    return selected && projectAreas.get(selected) === areaId ? selected : null
  }
  const tasks = input.confirmed_output.tasks.map((item, i) => ({ ...item, area_id: area("task", i, item.area_id), project_id: project(i, item.project_id, area("task", i, item.area_id)) }))
  const ideas = input.confirmed_output.ideas.map((item, i) => ({ ...item, area_id: area("idea", i, item.area_id) }))
  const secondBrain = input.confirmed_output.second_brain.map((item, i) => ({ ...item, area_id: area("knowledge", i, item.area_id) }))
  const approved = input.confirmed_output.suggestions.filter((item) => input.assignments[`suggestion:${item.type}:${item.name.toLowerCase()}`]).map((item) => ({ ...item, area_id: input.assignments[`suggestion-area:${item.type}:${item.name.toLowerCase()}`] ?? item.area_id ?? null }))
  const { data, error } = await supabase.rpc("save_capture", { p_idempotency_key: input.idempotency_key, p_raw_note: input.raw_note, p_tasks: tasks, p_ideas: ideas, p_second_brain: secondBrain, p_inbox: [], p_approved_suggestions: approved })
  if (error) throw new Error(error.message)
  return data as SaveCaptureResult
}
