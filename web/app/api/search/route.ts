import { NextResponse } from "next/server"
import { getHighlightRanges } from "@/lib/search/ranking"
import { parseSearchQuery } from "@/lib/search/dates"
import type { SearchMode, SearchResponse, SearchResult } from "@/lib/search/types"
import { createClient, getUser } from "@/lib/supabase/server"

type RpcSearchRow = {
  id: string
  kind: string
  label: string
  title: string
  context: string | null
  snippet: string | null
  highlight_ranges?: unknown
  due_date: string | null
  href: string
  score: number
  updated_at: string
}

const SEARCH_ERROR = "Search could not be completed."
const SEARCH_KINDS: Record<string, true> = {
  task: true,
  idea: true,
  knowledge: true,
  area: true,
  project: true,
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function isRpcSearchRow(value: unknown): value is RpcSearchRow {
  if (!value || typeof value !== "object") return false
  const row = value as Partial<RpcSearchRow>
  return (
    typeof row.id === "string" &&
    typeof row.kind === "string" &&
    SEARCH_KINDS[row.kind] === true &&
    typeof row.label === "string" &&
    typeof row.title === "string" &&
    (row.context === null || typeof row.context === "string") &&
    (row.snippet === null || typeof row.snippet === "string") &&
    (row.due_date === null || typeof row.due_date === "string") &&
    typeof row.href === "string" &&
    typeof row.score === "number" &&
    Number.isFinite(row.score) &&
    typeof row.updated_at === "string"
  )
}

function mapSearchRow(row: RpcSearchRow, tokens: readonly string[]): SearchResult {
  const highlightSource = row.snippet || row.title
  return {
    id: row.id,
    kind: row.kind as SearchResult["kind"],
    label: row.label as SearchResult["label"],
    title: row.title,
    context: row.context,
    snippet: row.snippet,
    highlightRanges: getHighlightRanges(highlightSource, tokens),
    dueDate: row.due_date,
    href: row.href,
    score: row.score,
    updatedAt: row.updated_at,
  }
}

export async function GET(request: Request) {
  let user: unknown
  try {
    user = await getUser()
  } catch {
    return errorResponse(SEARCH_ERROR, 500)
  }
  if (!user) return errorResponse("Authentication is required.", 401)

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const mode = searchParams.get("mode") ?? "compact"

  if (query === null || query.trim().length === 0) {
    return errorResponse("Search query is required.", 400)
  }
  if (query.length > 200) {
    return errorResponse("Search query must contain at most 200 characters.", 400)
  }
  if (mode !== "compact" && mode !== "all") {
    return errorResponse("Search mode must be compact or all.", 400)
  }

  const parsed = parseSearchQuery(query)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("unified_search", {
      p_query: parsed.text,
      p_due_date: parsed.dueDate,
      p_mode: mode as SearchMode,
    })

    if (error || !Array.isArray(data) || !data.every(isRpcSearchRow)) {
      return errorResponse(SEARCH_ERROR, 500)
    }

    const response: SearchResponse = {
      query,
      results: data.map((row) => mapSearchRow(row, parsed.tokens)),
    }
    return NextResponse.json(response)
  } catch {
    return errorResponse(SEARCH_ERROR, 500)
  }
}
