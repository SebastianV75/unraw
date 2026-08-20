import { afterEach, describe, expect, it, vi } from "vitest";
import { logCaptureTelemetry } from "./telemetry";

describe("capture telemetry", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs only the runtime allowlist and excludes sensitive canary fields", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logCaptureTelemetry({
      event: "capture_context_ready",
      correlationId: "corr-1",
      mode: "retrieval",
      model: "gpt-5-nano",
      candidateAreas: 2,
      candidateProjects: 3,
      rawNote: "secret raw note",
      query: "secret query",
      name: "secret name",
      id: "secret id",
      token: "secret token",
      sqlMessage: "secret sql",
      modelContent: "secret model output",
    } as never);

    const serialized = JSON.stringify(info.mock.calls[0]);
    expect(serialized).toContain("candidateAreas");
    for (const secret of [
      "rawNote",
      "query",
      "name",
      '"id":',
      "token",
      "sqlMessage",
      "modelContent",
      "secret",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
