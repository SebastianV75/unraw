export type ProjectStatus = "active" | "paused" | "completed"
export type TaskStatus = "pending" | "in_progress" | "done"
export type IdeaStatus = "new" | "evaluating" | "discarded" | "converted"
export type ProfileView = "list" | "kanban"
export type UserTier = "free" | "openrouter"
export type OpenRouterSettings = { configured: boolean; model: string }

export type CaptureTask = { title: string; area_id: string | null; project_id: string | null; suggested_new_area: string | null; suggested_new_project: string | null }
export type CaptureIdea = { content: string; area_id: string | null; suggested_new_area: string | null }
export type CaptureSecondBrain = { title: string; content: string; area_id: string | null; tags: string[]; suggested_new_area: string | null }
export type CaptureSuggestion = { type: "new_area" | "new_project"; name: string; reason: string; area_id?: string | null }
export type CaptureOutput = { tasks: CaptureTask[]; ideas: CaptureIdea[]; second_brain: CaptureSecondBrain[]; suggestions: CaptureSuggestion[] }
export type CapturePreference = "tasks" | "ideas" | "knowledge"
export type SaveCaptureInput = { idempotency_key: string; raw_note: string; confirmed_output: CaptureOutput; assignments: Record<string, string | null> }
export type SaveCaptureResult = { batch_id: string; affected_area_ids: string[]; inbox_item_ids: string[]; existing: boolean }
export type InboxItem = { id: string; batch_id: string; kind: "task" | "idea" | "knowledge"; title: string | null; content: string; raw_note: string; needs_home: boolean; created_at: string }

export type Profile = {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  onboarding_completed: boolean
  preferred_view: ProfileView
  captures_used: number
  captures_reset_date: string
  openrouter_model: string
  tier: UserTier
  created_at: string
  updated_at: string
}

export type Area = {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  user_id: string
  area_id: string
  name: string
  description: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  user_id: string
  area_id: string
  project_id: string | null
  title: string
  notes: string | null
  status: TaskStatus
  due_date: string | null
  created_at: string
  updated_at: string
}

export type Idea = {
  id: string
  user_id: string
  area_id: string
  content: string
  status: IdeaStatus
  created_at: string
  updated_at: string
}

export type SecondBrainEntry = {
  id: string
  user_id: string
  area_id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}
