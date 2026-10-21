import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient, getUser } from "@/lib/supabase/server"

const reassignSchema = z.object({
  id: z.string().uuid(),
  area_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
}).strict()

export async function PATCH(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  let input: unknown
  try { input = await request.json() } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 })
  }
  const parsed = reassignSchema.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: "A valid Inbox item, area and optional project are required." }, { status: 400 })
  const body = parsed.data
  const supabase = await createClient(); const { error } = await supabase.rpc("reassign_inbox_item", { p_item_id: body.id, p_area_id: body.area_id, p_project_id: body.project_id ?? null })
  if (error) return NextResponse.json({ error: "The Inbox item could not be reassigned." }, { status: 400 })
  return NextResponse.json({ ok: true })
}
