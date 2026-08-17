import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
  getUser: mocks.getUser,
}))

const rpcRow = {
  id: "task-1",
  kind: "task",
  label: "Tarea",
  title: "Preparar presentación",
  context: "Trabajo / Lanzamiento",
  snippet: "Preparar la presentación para el lunes",
  highlight_ranges: [],
  due_date: "2026-08-17",
  href: "/areas/area-1/projects/project-1",
  score: 100,
  updated_at: "2026-08-14T12:00:00Z",
}

function request(query = "plan") {
  return new Request(`http://localhost/api/search?${query}`)
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ id: "user-1" })
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc })
    mocks.rpc.mockResolvedValue({ data: [rpcRow], error: null })
  })

  it("requires authentication", async () => {
    mocks.getUser.mockResolvedValue(null)

    const response = await GET(request("q=plan"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Authentication is required." })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("rejects missing, blank, and oversized queries", async () => {
    const missing = await GET(request())
    const blank = await GET(request("q=%20%20"))
    const oversized = await GET(request(`q=${"x".repeat(201)}`))

    expect(missing.status).toBe(400)
    expect(blank.status).toBe(400)
    expect(oversized.status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("rejects an unsupported mode", async () => {
    const response = await GET(request("q=plan&mode=preview"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Search mode must be compact or all." })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("passes parsed text, ISO date, and compact mode to the RPC", async () => {
    const response = await GET(request("q=2026-08-17%20plan"))

    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith("unified_search", {
      p_query: "plan",
      p_due_date: "2026-08-17",
      p_mode: "compact",
    })
  })

  it("maps RPC rows to the camelCase response and calculates safe ranges", async () => {
    const response = await GET(request("q=presentacion"))

    await expect(response.json()).resolves.toEqual({
      query: "presentacion",
      results: [
        {
          id: "task-1",
          kind: "task",
          label: "Tarea",
          title: "Preparar presentación",
          context: "Trabajo / Lanzamiento",
          snippet: "Preparar la presentación para el lunes",
          highlightRanges: [[12, 24]],
          dueDate: "2026-08-17",
          href: "/areas/area-1/projects/project-1",
          score: 100,
          updatedAt: "2026-08-14T12:00:00Z",
        },
      ],
    })
  })

  it("passes all mode through and returns every valid row", async () => {
    mocks.rpc.mockResolvedValue({ data: [rpcRow, { ...rpcRow, id: "task-2" }], error: null })

    const response = await GET(request("q=plan&mode=all"))

    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith("unified_search", {
      p_query: "plan",
      p_due_date: null,
      p_mode: "all",
    })
    await expect(response.json()).resolves.toMatchObject({ results: [{ id: "task-1" }, { id: "task-2" }] })
  })

  it("hides RPC failures behind a stable server error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("database details") })

    const response = await GET(request("q=plan"))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Search could not be completed." })
  })

  it("rejects unexpected RPC JSON", async () => {
    mocks.rpc.mockResolvedValue({ data: { result: rpcRow }, error: null })

    const response = await GET(request("q=plan"))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Search could not be completed." })
  })
})
