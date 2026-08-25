import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUser, createClient, createAdminClient, deleteUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  deleteUser: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ getUser, createClient }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }))

import { DELETE, GET, PATCH } from "./route"

const user = { id: "user-1", email: "ana@example.com" }

function clientFor({
  profile = { name: "Ana", capture_preferences: ["tasks", "ideas"], preferred_view: "list" },
  profileError = null,
  upserted = profile,
  upsertError = null,
} = {}) {
  const maybeSingle = vi.fn(async () => ({ data: profile, error: profileError }))
  const single = vi.fn(async () => ({ data: upserted, error: upsertError }))
  const upsert = vi.fn(() => ({ select: () => ({ single }) }))
  createClient.mockResolvedValue({
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    })),
  })
  return { maybeSingle, upsert, single }
}

function request(method: string, body: unknown) {
  return new Request("http://test/api/settings/account", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

async function json(response: Response) { return response.json() }

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue(user)
  deleteUser.mockResolvedValue({ error: null })
  createAdminClient.mockReturnValue({ auth: { admin: { deleteUser } } })
})

describe("account settings route", () => {
  it.each(["GET", "PATCH", "DELETE"])("requires authentication for %s", async (method) => {
    getUser.mockResolvedValue(null)
    const response = method === "GET"
      ? await GET()
      : method === "PATCH"
        ? await PATCH(request(method, { name: "Ana" }))
        : await DELETE(request(method, { confirmation: "ELIMINAR MI CUENTA" }))
    expect(response.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it("returns auth email and conservative defaults when profile is absent", async () => {
    clientFor({ profile: null })
    expect(await json(await GET())).toEqual({
      email: user.email,
      name: null,
      capture_preferences: ["tasks", "ideas"],
      preferred_view: "list",
    })
  })

  it("returns saved account preferences", async () => {
    clientFor({ profile: { name: "Ana", capture_preferences: ["knowledge"], preferred_view: "kanban" } })
    expect(await json(await GET())).toEqual({
      email: user.email,
      name: "Ana",
      capture_preferences: ["knowledge"],
      preferred_view: "kanban",
    })
  })

  it("updates account preferences partially", async () => {
    const { upsert } = clientFor({
      upserted: { name: "Ana", capture_preferences: ["ideas"], preferred_view: "kanban" },
    })
    const response = await PATCH(request("PATCH", { preferred_view: "kanban", capture_preferences: ["ideas"] }))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      { id: user.id, capture_preferences: ["ideas"], preferred_view: "kanban" },
      { onConflict: "id" },
    )
    expect(await json(response)).toEqual({
      name: "Ana",
      capture_preferences: ["ideas"],
      preferred_view: "kanban",
    })
  })

  it.each([
    { capture_preferences: [] },
    { capture_preferences: ["tasks", "tasks"] },
    { capture_preferences: ["tasks", "ideas", "knowledge", "tasks"] },
    { capture_preferences: ["other"] },
    { preferred_view: "grid" },
  ])("rejects invalid preferences: %o", async (body) => {
    expect((await PATCH(request("PATCH", body))).status).toBe(400)
  })

  it("updates only the authenticated profile name", async () => {
    const { upsert } = clientFor({
      upserted: { name: "Nuevo nombre", capture_preferences: ["tasks", "ideas"], preferred_view: "list" },
    })
    const response = await PATCH(request("PATCH", { name: "Nuevo nombre" }))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith({ id: user.id, name: "Nuevo nombre" }, { onConflict: "id" })
    expect(await json(response)).toEqual({
      name: "Nuevo nombre",
      capture_preferences: ["tasks", "ideas"],
      preferred_view: "list",
    })
  })

  it("rejects malformed or oversized names", async () => {
    expect((await PATCH(request("PATCH", { name: "x".repeat(101) }))).status).toBe(400)
    expect((await PATCH(request("PATCH", { name: "Ana", extra: "ignored" }))).status).toBe(400)
  })

  it("requires the exact deletion confirmation phrase", async () => {
    const response = await DELETE(request("DELETE", { confirmation: "eliminar mi cuenta" }))
    expect(response.status).toBe(400)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it("deletes the authenticated account through the admin client", async () => {
    const response = await DELETE(request("DELETE", { confirmation: "ELIMINAR MI CUENTA" }))
    expect(response.status).toBe(200)
    expect(deleteUser).toHaveBeenCalledWith(user.id)
    expect(await json(response)).toEqual({ deleted: true })
  })

  it("returns a generic error when admin deletion fails", async () => {
    deleteUser.mockResolvedValue({ error: { message: "secret admin detail" } })
    const response = await DELETE(request("DELETE", { confirmation: "ELIMINAR MI CUENTA" }))
    expect(response.status).toBe(500)
    expect(JSON.stringify(await json(response))).not.toContain("secret admin detail")
  })
})
