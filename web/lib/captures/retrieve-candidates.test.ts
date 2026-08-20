import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CAPTURE_CANDIDATE_ERROR_CODES,
  CaptureCandidateError,
  retrieveCaptureCandidates,
} from "./retrieve-candidates";

const areaId = "00000000-0000-0000-0000-000000000001";
const projectId = "00000000-0000-0000-0000-000000000002";
const rows = [
  {
    kind: "project",
    id: projectId,
    name: "Proyecto exacto",
    area_id: areaId,
    area_name: "Trabajo",
    score: 100,
  },
  {
    kind: "area",
    id: areaId,
    name: "Trabajo",
    area_id: null,
    area_name: null,
    score: 99,
  },
];
const client = (
  data: unknown = rows,
  error: unknown = null,
) => ({
  rpc: vi.fn(async () => ({ data, error })),
});

async function captureError(action: () => Promise<unknown>) {
  try {
    await action();
    throw new Error("expected retrieval to fail");
  } catch (error) {
    return error;
  }
}

describe("retrieveCaptureCandidates", () => {
  it("normalizes, clamps limits, validates shape, and preserves project parents", async () => {
    const supabase = client();
    const result = await retrieveCaptureCandidates(
      ["  ÁREA  ", "área"],
      { areaLimit: 999, projectLimit: -4 },
      supabase,
    );
    expect(supabase.rpc).toHaveBeenCalledWith("capture_candidate_retrieval", {
      p_queries: ["area"],
      p_area_limit: 32,
      p_project_limit: 0,
    });
    expect(result.areas).toEqual([{ id: areaId, name: "Trabajo", score: 99 }]);
    expect(result.projects[0].area_id).toBe(areaId);
    expect(result.metadata).toMatchObject({
      queryCount: 1,
      areaCount: 1,
      projectCount: 1,
    });
  });

  it("rejects invalid queries before calling RPC with the exact public error", async () => {
    for (const input of [
      Array.from({ length: 9 }, (_, i) => `q${i}`),
      "a".repeat(201),
      " ",
      "x",
      "bad\0query",
    ]) {
      const supabase = client();
      const error = await captureError(() =>
        retrieveCaptureCandidates(input, {}, supabase),
      );
      expect(error).toBeInstanceOf(CaptureCandidateError);
      expect(error).toMatchObject({
        code: CAPTURE_CANDIDATE_ERROR_CODES.INVALID_QUERY,
      });
      expect((error as Error).message).toBe("INVALID_QUERY");
      expect(supabase.rpc).not.toHaveBeenCalled();
    }
  });

  it("keeps special characters as data and does not call RPC for an empty list", async () => {
    const supabase = client([]);
    await retrieveCaptureCandidates("c++", {}, supabase);
    expect(supabase.rpc).toHaveBeenCalledWith(
      "capture_candidate_retrieval",
      expect.objectContaining({ p_queries: ["c++"] }),
    );
    const empty = client();
    await expect(retrieveCaptureCandidates([], {}, empty)).resolves.toMatchObject({
      areas: [],
      projects: [],
      metadata: { queryCount: 0 },
    });
    expect(empty.rpc).not.toHaveBeenCalled();
  });

  it("reserves RPC_UNAVAILABLE for transport failures", async () => {
    const error = await captureError(() =>
      retrieveCaptureCandidates("trabajo", {}, {
        rpc: vi.fn(async () => {
      throw new Error("secret transport detail");
        }),
      }),
    );
    expect(error).toBeInstanceOf(CaptureCandidateError);
    expect(error).toMatchObject({
      code: CAPTURE_CANDIDATE_ERROR_CODES.RPC_UNAVAILABLE,
    });
    expect((error as Error).message).toBe("RPC_UNAVAILABLE");
    expect((error as Error).message).not.toContain("secret transport detail");
  });

  it("classifies SQL rejections without exposing database details", async () => {
    for (const [databaseCode, expectedCode] of [
      ["22023", CAPTURE_CANDIDATE_ERROR_CODES.INVALID_QUERY],
      ["42501", CAPTURE_CANDIDATE_ERROR_CODES.RPC_REJECTED],
      ["XX000", CAPTURE_CANDIDATE_ERROR_CODES.RPC_REJECTED],
      ["PGRST202", CAPTURE_CANDIDATE_ERROR_CODES.RPC_REJECTED],
    ] as const) {
      const error = await captureError(() =>
        retrieveCaptureCandidates(
      "trabajo",
      {},
      client([], { code: databaseCode, message: "secret database detail" }),
        ),
      );
      expect(error).toBeInstanceOf(CaptureCandidateError);
      expect(error).toMatchObject({ code: expectedCode });
      expect((error as Error).message).toBe(expectedCode);
      expect((error as Error).message).not.toContain("secret database detail");
    }
  });

  it("maps malformed RPC payloads to INVALID_PAYLOAD", async () => {
    for (const malformed of [
      [{ kind: "area", id: areaId, name: "Trabajo", area_id: areaId, area_name: "Trabajo", score: 1 }],
      [{ kind: "project", id: projectId, name: "P", area_id: null, area_name: null, score: 1 }],
      [{ kind: "area", id: areaId, name: "Trabajo", area_id: null, area_name: null, score: 1, extra: true }],
    ]) {
      const error = await captureError(() =>
        retrieveCaptureCandidates("trabajo", {}, client(malformed)),
      );
      expect(error).toBeInstanceOf(CaptureCandidateError);
      expect(error).toMatchObject({
        code: CAPTURE_CANDIDATE_ERROR_CODES.INVALID_PAYLOAD,
      });
      expect((error as Error).message).toBe("INVALID_PAYLOAD");
    }
  });
});
