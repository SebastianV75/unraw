export type CaptureTelemetryEvent = {
  event: string;
  correlationId: string;
  mode: "legacy" | "retrieval";
  model?: string;
  provider?: "free" | "openrouter";
  candidateAreas?: number;
  candidateProjects?: number;
  retrievalElapsedMs?: number;
  promptAreas?: number;
  promptProjects?: number;
  modelLatencyMs?: number;
  usagePromptTokens?: number;
  usageCompletionTokens?: number;
  usageTotalTokens?: number;
  errorClass?: string;
};

type TelemetryInput = Record<string, unknown>;

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length <= 200 ? value : fallback;
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

/** Safe capture telemetry boundary. Extra caller fields are never forwarded. */
export function logCaptureTelemetry(
  event: CaptureTelemetryEvent | TelemetryInput,
  level: "info" | "warn" | "error" = "info",
): void {
  const input = event as TelemetryInput;
  const payload = {
    event: safeString(input.event, "unknown"),
    correlationId: safeString(input.correlationId, "unknown"),
    mode: input.mode === "retrieval" ? "retrieval" : "legacy",
    model: typeof input.model === "string" && input.model.length <= 200 ? input.model : undefined,
    provider: input.provider === "free" || input.provider === "openrouter" ? input.provider : undefined,
    candidateAreas: safeNumber(input.candidateAreas),
    candidateProjects: safeNumber(input.candidateProjects),
    retrievalElapsedMs: safeNumber(input.retrievalElapsedMs),
    promptAreas: safeNumber(input.promptAreas),
    promptProjects: safeNumber(input.promptProjects),
    modelLatencyMs: safeNumber(input.modelLatencyMs),
    usagePromptTokens: safeNumber(input.usagePromptTokens),
    usageCompletionTokens: safeNumber(input.usageCompletionTokens),
    usageTotalTokens: safeNumber(input.usageTotalTokens),
    errorClass:
      typeof input.errorClass === "string" && input.errorClass.length <= 100
        ? input.errorClass
        : undefined,
  };
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger("[capture]", payload);
}
