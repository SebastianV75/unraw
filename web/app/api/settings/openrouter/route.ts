import { NextResponse } from "next/server"
import { z } from "zod"
import { encryptOpenRouterToken } from "@/lib/security/openrouter-token"
import { createClient, getUser } from "@/lib/supabase/server"

export const runtime = "nodejs"

const DEFAULT_MODEL = "openai/gpt-4.1-nano"
const settingsSchema = z.object({
  apiKey: z.string().trim().min(1).max(500).optional(),
  model: z.string().trim().min(1).max(200),
})

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const user = await getUser()
  if (!user) return errorResponse("Authentication is required.", 401)

  const supabase = await createClient()
  const { data, error } = await supabase.from("profiles").select("openrouter_token, openrouter_model, tier").eq("id", user.id).single()
  if (error || !data) return errorResponse("OpenRouter settings could not be loaded.", 500)

  return NextResponse.json({ configured: Boolean(data.openrouter_token && data.tier === "openrouter"), model: data.openrouter_model || DEFAULT_MODEL })
}

export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return errorResponse("Authentication is required.", 401)

  let body: unknown
  try { body = await request.json() } catch { return errorResponse("The request body must be valid JSON.", 400) }
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) return errorResponse("The API key or model is invalid.", 400)
  if (parsed.data.apiKey && !/^sk-or-[A-Za-z0-9_-]{10,}$/.test(parsed.data.apiKey)) return errorResponse("The OpenRouter API key format is invalid.", 400)

  const supabase = await createClient()
  const { data: current, error: currentError } = await supabase.from("profiles").select("openrouter_token").eq("id", user.id).single()
  if (currentError || !current) return errorResponse("OpenRouter settings could not be loaded.", 500)
  if (!parsed.data.apiKey && !current.openrouter_token) return errorResponse("An OpenRouter API key is required.", 400)
  const update: { openrouter_model: string; tier: "openrouter"; openrouter_token?: string } = { openrouter_model: parsed.data.model, tier: "openrouter" }
  if (parsed.data.apiKey) {
    try { update.openrouter_token = encryptOpenRouterToken(parsed.data.apiKey) } catch { return errorResponse("OpenRouter settings are unavailable.", 503) }
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id)
  if (error) return errorResponse("OpenRouter settings could not be saved.", 500)
  return NextResponse.json({ configured: true, model: parsed.data.model })
}

export async function DELETE() {
  const user = await getUser()
  if (!user) return errorResponse("Authentication is required.", 401)

  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ openrouter_token: null, tier: "free" }).eq("id", user.id)
  if (error) return errorResponse("OpenRouter settings could not be removed.", 500)
  return NextResponse.json({ configured: false, model: DEFAULT_MODEL })
}
