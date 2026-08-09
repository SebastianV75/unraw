import { NextResponse } from "next/server"
import { createClient, getUser } from "@/lib/supabase/server"
export async function PATCH(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  const body = await request.json() as { id?: string; area_id?: string; project_id?: string | null }
  if (!body.id || !body.area_id) return NextResponse.json({ error: "An Inbox item and area are required." }, { status: 400 })
  const supabase = await createClient(); const { error } = await supabase.rpc("reassign_inbox_item", { p_item_id: body.id, p_area_id: body.area_id, p_project_id: body.project_id ?? null })
  if (error) return NextResponse.json({ error: "The Inbox item could not be reassigned." }, { status: 400 })
  return NextResponse.json({ ok: true })
}
