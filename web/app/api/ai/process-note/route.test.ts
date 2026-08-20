import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  getUser,
  createClient,
  createAdminClient,
  processNote,
  decryptOpenRouterToken,
  retrieveCaptureCandidates,
  logCaptureTelemetry,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  processNote: vi.fn(),
  decryptOpenRouterToken: vi.fn(),
  retrieveCaptureCandidates: vi.fn(),
  logCaptureTelemetry: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ getUser, createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/security/openrouter-token", () => ({ decryptOpenRouterToken }));
vi.mock("@/lib/captures/retrieve-candidates", async () => ({
  ...(await vi.importActual<typeof import("@/lib/captures/retrieve-candidates")>(
    "@/lib/captures/retrieve-candidates",
  )),
  retrieveCaptureCandidates,
}));
vi.mock("@/lib/captures/telemetry", () => ({ logCaptureTelemetry }));
vi.mock("@/lib/ai/process-note", async () => ({
  ...(await vi.importActual<typeof import("@/lib/ai/process-note")>(
    "@/lib/ai/process-note",
  )),
  processNote,
}));

import { POST } from "./route";

const body = { raw_note: "Buy milk", timezone: "UTC" };
function query(result: unknown) {
  const chain = {
    eq: () => chain,
    single: async () => result,
    order: () => chain,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return { select: () => chain };
}
function clientFor(profile: unknown, rpcResults: Record<string, unknown> = {}) {
  const rpc = vi.fn(
    async (name: string) => rpcResults[name] ?? { data: null, error: null },
  );
  const from = vi.fn((table: string) =>
    query(
      table === "profiles"
        ? { data: profile, error: null }
        : { data: [], error: null },
    ),
  );
  const adminRpc = vi.fn(
    async () => rpcResults.refund_free_capture ?? { data: null, error: null },
  );
  createClient.mockResolvedValue({ from, rpc });
  createAdminClient.mockReturnValue({ rpc: adminRpc });
  return { rpc, adminRpc, from };
}
async function post() {
  return POST(
    new Request("http://test", { method: "POST", body: JSON.stringify(body) }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.CAPTURE_CANDIDATE_RETRIEVAL_ENABLED = "false";
  getUser.mockResolvedValue({ id: "user-1" });
  processNote.mockResolvedValue({
    tasks: [],
    ideas: [],
    second_brain: [],
    suggestions: [],
  });
  retrieveCaptureCandidates.mockResolvedValue({
    areas: [],
    projects: [],
    metadata: { queryCount: 0, areaCount: 0, projectCount: 0, elapsedMs: 1 },
  });
  decryptOpenRouterToken.mockReturnValue("sk-or-secret");
});

describe("process-note route", () => {
  it("uses the free model and consumes quota", async () => {
    const { rpc } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: true }], error: null },
      },
    );
    expect((await post()).status).toBe(200);
    expect(processNote).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-5-nano", baseURL: undefined }),
    );
    expect(rpc).toHaveBeenCalledWith("consume_free_capture");
  });

  it("uses bounded retrieval context when the flag is enabled", async () => {
    process.env.CAPTURE_CANDIDATE_RETRIEVAL_ENABLED = "true";
    retrieveCaptureCandidates.mockResolvedValue({
      areas: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          name: "Trabajo",
          score: 100,
        },
      ],
      projects: [
        {
          id: "00000000-0000-0000-0000-000000000002",
          name: "Lanzamiento",
          area_id: "00000000-0000-0000-0000-000000000001",
          area_name: "Trabajo",
          score: 90,
        },
      ],
      metadata: { queryCount: 1, areaCount: 1, projectCount: 1, elapsedMs: 1 },
    });
    const { rpc, from } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: true }], error: null },
      },
    );
    expect((await post()).status).toBe(200);
    expect(retrieveCaptureCandidates).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("profiles");
    expect(from).not.toHaveBeenCalledWith("areas");
    expect(from).not.toHaveBeenCalledWith("projects");
    expect(processNote).toHaveBeenCalledWith(
      expect.objectContaining({
        user_context: {
          areas: [
            { id: "00000000-0000-0000-0000-000000000001", name: "Trabajo" },
          ],
          projects: [
            {
              id: "00000000-0000-0000-0000-000000000002",
              name: "Lanzamiento",
              area_id: "00000000-0000-0000-0000-000000000001",
            },
          ],
          timezone: "UTC",
        },
      }),
    );
    expect(rpc).toHaveBeenCalledWith("consume_free_capture");
  });

      it("uses empty context for an empty retrieval success without warning", async () => {
        process.env.CAPTURE_CANDIDATE_RETRIEVAL_ENABLED = "true";
        const { from, rpc } = clientFor(
          { tier: "free", openrouter_token: null, openrouter_model: null },
          { consume_free_capture: { data: [{ allowed: true }], error: null } },
        );
        expect((await post()).status).toBe(200);
        expect(processNote).toHaveBeenCalledTimes(1);
        expect(logCaptureTelemetry).not.toHaveBeenCalledWith(
          expect.objectContaining({ event: "candidate_retrieval_failed" }),
          "warn",
        );
        expect(from).not.toHaveBeenCalledWith("areas");
        expect(from).not.toHaveBeenCalledWith("projects");
        expect(rpc).toHaveBeenCalledWith("consume_free_capture");
      });

      it("falls back safely on RPC_UNAVAILABLE and preserves raw_note", async () => {
        process.env.CAPTURE_CANDIDATE_RETRIEVAL_ENABLED = "true";
        const { CaptureCandidateError, CAPTURE_CANDIDATE_ERROR_CODES } =
          await import("@/lib/captures/retrieve-candidates");
        retrieveCaptureCandidates.mockRejectedValue(
          new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.RPC_UNAVAILABLE),
        );
        const { from } = clientFor(
          { tier: "free", openrouter_token: null, openrouter_model: null },
          { consume_free_capture: { data: [{ allowed: true }], error: null } },
        );
        expect((await post()).status).toBe(200);
        expect(processNote).toHaveBeenCalledTimes(1);
        expect(processNote).toHaveBeenCalledWith(
          expect.objectContaining({ raw_note: body.raw_note, user_context: expect.objectContaining({ areas: [], projects: [] }) }),
        );
        expect(from).not.toHaveBeenCalledWith("areas");
        expect(from).not.toHaveBeenCalledWith("projects");
        expect(logCaptureTelemetry).toHaveBeenCalledWith(
          expect.objectContaining({ errorClass: "RPC_UNAVAILABLE" }),
          "warn",
        );
      });

      it("rejects INVALID_PAYLOAD without calling the model", async () => {
        process.env.CAPTURE_CANDIDATE_RETRIEVAL_ENABLED = "true";
        const { CaptureCandidateError, CAPTURE_CANDIDATE_ERROR_CODES } =
          await import("@/lib/captures/retrieve-candidates");
        retrieveCaptureCandidates.mockRejectedValue(
          new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.INVALID_PAYLOAD),
        );
        const { from, rpc } = clientFor(
          { tier: "free", openrouter_token: null, openrouter_model: null },
          { consume_free_capture: { data: [{ allowed: true }], error: null } },
        );
        const response = await post();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "The note context could not be loaded." });
        expect(processNote).not.toHaveBeenCalled();
        expect(rpc).not.toHaveBeenCalledWith("consume_free_capture");
        expect(from).not.toHaveBeenCalledWith("areas");
        expect(from).not.toHaveBeenCalledWith("projects");
        expect(logCaptureTelemetry).toHaveBeenCalledWith(
          expect.objectContaining({ event: "candidate_retrieval_rejected", errorClass: "INVALID_PAYLOAD" }),
          "error",
        );
      });

          it("rejects database RPC errors without consuming quota or calling the model", async () => {
            process.env.CAPTURE_CANDIDATE_RETRIEVAL_ENABLED = "true";
            const { CaptureCandidateError, CAPTURE_CANDIDATE_ERROR_CODES } =
              await import("@/lib/captures/retrieve-candidates");
            retrieveCaptureCandidates.mockRejectedValue(
              new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.RPC_REJECTED),
            );
            const { from, rpc } = clientFor(
              { tier: "free", openrouter_token: null, openrouter_model: null },
              { consume_free_capture: { data: [{ allowed: true }], error: null } },
            );
            const response = await post();
            expect(response.status).toBe(500);
            expect(processNote).not.toHaveBeenCalled();
            expect(from).not.toHaveBeenCalledWith("areas");
            expect(from).not.toHaveBeenCalledWith("projects");
            expect(rpc).not.toHaveBeenCalledWith("consume_free_capture");
            expect(logCaptureTelemetry).toHaveBeenCalledWith(
              expect.objectContaining({
                event: "candidate_retrieval_rejected",
                errorClass: "RPC_REJECTED",
              }),
              "error",
            );
          });

          it("rejects unexpected retrieval failures without loading the catalog", async () => {
    process.env.CAPTURE_CANDIDATE_RETRIEVAL_ENABLED = "true";
    retrieveCaptureCandidates.mockRejectedValue(new Error("database details"));
    const { from, rpc } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: true }], error: null },
      },
    );
    const response = await post();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "The note context could not be loaded.",
    });
    expect(processNote).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalledWith("areas");
    expect(from).not.toHaveBeenCalledWith("projects");
    expect(logCaptureTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "candidate_retrieval_rejected",
        errorClass: "UNEXPECTED_ERROR",
      }),
      "error",
    );
    expect(rpc).not.toHaveBeenCalledWith("consume_free_capture");
  });

  it("uses the configured OpenRouter model and base URL", async () => {
    clientFor({
      tier: "openrouter",
      openrouter_token: "ciphertext",
      openrouter_model: "anthropic/claude-3.5-haiku",
    });
    expect((await post()).status).toBe(200);
    expect(decryptOpenRouterToken).toHaveBeenCalledWith("ciphertext");
    expect(processNote).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "anthropic/claude-3.5-haiku",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: "sk-or-secret",
      }),
    );
  });

  it("does not call the model when the token cannot be decrypted", async () => {
    clientFor({
      tier: "openrouter",
      openrouter_token: "ciphertext",
      openrouter_model: "openai/gpt-5-nano",
    });
    decryptOpenRouterToken.mockImplementation(() => {
      throw new Error("tampered");
    });
    expect((await post()).status).toBe(503);
    expect(processNote).not.toHaveBeenCalled();
  });

  it("refunds consumed free quota when processing fails", async () => {
    const { rpc, adminRpc } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: true }], error: null },
        refund_free_capture: { data: [{ refunded: true }], error: null },
      },
    );
    processNote.mockRejectedValue(new Error("provider failed"));
    expect((await post()).status).toBe(500);
    expect(rpc).toHaveBeenCalledWith("consume_free_capture");
    expect(adminRpc).toHaveBeenCalledWith("refund_free_capture", {
      p_user_id: "user-1",
    });
    expect(adminRpc).toHaveBeenCalledTimes(1);
  });

  it("preserves the ProcessNoteError when refund RPC fails", async () => {
    const { adminRpc } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: true }], error: null },
        refund_free_capture: {
          data: null,
          error: { code: "42501", message: "refund denied" },
        },
      },
    );
    const original = new (
      await import("@/lib/ai/process-note")
    ).ProcessNoteError("provider rejected", 422);
    processNote.mockRejectedValue(original);

    const response = await post();
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "provider rejected" });
    expect(adminRpc).toHaveBeenCalledTimes(1);
  });

  it("preserves the original error when creating the admin client throws", async () => {
    clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: true }], error: null },
      },
    );
    createAdminClient.mockImplementation(() => {
      throw new Error("admin unavailable");
    });
    const original = new (
      await import("@/lib/ai/process-note")
    ).ProcessNoteError("provider rejected", 409);
    processNote.mockRejectedValue(original);

    const response = await post();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "provider rejected" });
  });

  it("does not refund when free consumption is denied", async () => {
    const { adminRpc } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: false }], error: null },
      },
    );
    const response = await post();
    expect(response.status).toBe(429);
    expect(adminRpc).not.toHaveBeenCalled();
    expect(processNote).not.toHaveBeenCalled();
  });

  it("does not refund when free consumption fails", async () => {
    const { adminRpc } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: null, error: { code: "40001" } },
      },
    );
    const response = await post();
    expect(response.status).toBe(500);
    expect(adminRpc).not.toHaveBeenCalled();
    expect(processNote).not.toHaveBeenCalled();
  });

  it("does not refund successful free processing", async () => {
    const { adminRpc } = clientFor(
      { tier: "free", openrouter_token: null, openrouter_model: null },
      {
        consume_free_capture: { data: [{ allowed: true }], error: null },
      },
    );
    expect((await post()).status).toBe(200);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("never consumes or refunds OpenRouter processing", async () => {
    const { rpc, adminRpc } = clientFor({
      tier: "openrouter",
      openrouter_token: "ciphertext",
      openrouter_model: "openai/gpt-5-nano",
    });
    expect((await post()).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
    expect(adminRpc).not.toHaveBeenCalled();
  });
});
