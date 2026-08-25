import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient, getUser } from "@/lib/supabase/server"

export const runtime = "nodejs"

const capturePreferenceSchema = z
  .array(z.enum(["tasks", "ideas", "knowledge"]))
  .min(1)
  .max(3)
  .refine((values) => new Set(values).size === values.length)
const accountSchema = z
  .object({
    name: z.string().trim().max(100).optional(),
    capture_preferences: capturePreferenceSchema.optional(),
    preferred_view: z.enum(["list", "kanban"]).optional(),
  })
  .strict()
const deleteSchema = z.object({ confirmation: z.literal("ELIMINAR MI CUENTA") }).strict()

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const user = await getUser()
  if (!user) return errorResponse("Authentication is required.", 401)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("name, capture_preferences, preferred_view")
    .eq("id", user.id)
    .maybeSingle()
  if (error) return errorResponse("Account settings could not be loaded.", 500)

  return NextResponse.json({
    email: user.email ?? null,
    name: data?.name ?? null,
    capture_preferences:
      data?.capture_preferences?.length ? data.capture_preferences : ["tasks", "ideas"],
    preferred_view: data?.preferred_view ?? "list",
  })
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return errorResponse("Authentication is required.", 401)

  let body: unknown
  try { body = await request.json() } catch { return errorResponse("The request body must be valid JSON.", 400) }
  const parsed = accountSchema.safeParse(body)
  if (!parsed.success || Object.keys(parsed.data).length === 0)
    return errorResponse("Account settings are invalid.", 400)

  const updates = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name || null } : {}),
    ...(parsed.data.capture_preferences !== undefined ? { capture_preferences: parsed.data.capture_preferences } : {}),
    ...(parsed.data.preferred_view !== undefined ? { preferred_view: parsed.data.preferred_view } : {}),
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...updates }, { onConflict: "id" })
    .select("name, capture_preferences, preferred_view")
    .single()
  if (error || !data) return errorResponse("Account settings could not be saved.", 500)

  return NextResponse.json({
    name: data.name ?? null,
    capture_preferences: data.capture_preferences?.length ? data.capture_preferences : ["tasks", "ideas"],
    preferred_view: data.preferred_view ?? "list",
  })
}


export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return errorResponse("Authentication is required.", 401)

  let body: unknown
  try { body = await request.json() } catch { return errorResponse("The request body must be valid JSON.", 400) }
  if (!deleteSchema.safeParse(body).success) {
    return errorResponse("The confirmation phrase is invalid.", 400)
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return errorResponse("The account could not be deleted.", 500)
  } catch {
    return errorResponse("The account could not be deleted.", 500)
  }

  return NextResponse.json({ deleted: true })
}
