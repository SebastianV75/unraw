import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUser, createClient, rpc } = vi.hoisted(() => ({
  getUser: vi.fn(), createClient: vi.fn(), rpc: vi.fn(),
}))
vi.mock("@/lib/supabase/server", () => ({ getUser, createClient }))
import { PATCH } from "./route"

const id = "10000000-0000-4000-8000-000000000001"
const area_id = "10000000-0000-4000-8000-000000000002"
const request = (body: string) => new Request("http://test", { method: "PATCH", body })

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue({ id })
  createClient.mockResolvedValue({ rpc })
  rpc.mockResolvedValue({ error: null })
})

describe("Inbox reassignment", () => {
  it("requires authentication", async () => {
    getUser.mockResolvedValue(null)
    expect((await PATCH(request("{}"))).status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it.each(["{", "null", JSON.stringify({ id: 123, area_id }), JSON.stringify({ id, area_id, project_id: "invalid" })])(
    "rejects malformed requests before calling the database: %s", async (body) => {
      expect((await PATCH(request(body))).status).toBe(400)
      expect(rpc).not.toHaveBeenCalled()
    },
  )

  it("reassigns a valid item with no project", async () => {
    expect((await PATCH(request(JSON.stringify({ id, area_id })))).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith("reassign_inbox_item", { p_item_id: id, p_area_id: area_id, p_project_id: null })
  })
})
