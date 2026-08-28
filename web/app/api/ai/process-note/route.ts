import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import {
  processNote,
  processNoteInputSchema,
  ProcessNoteError,
} from "@/lib/ai/process-note";
import { decryptOpenRouterToken } from "@/lib/security/openrouter-token";
import { FREE_MODEL } from "@/lib/ai/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCaptureCandidateQueries } from "@/lib/captures/query-builder";
import {
  CaptureCandidateError,
  CAPTURE_CANDIDATE_ERROR_CODES,
  retrieveCaptureCandidates,
} from "@/lib/captures/retrieve-candidates";
import { logCaptureTelemetry } from "@/lib/captures/telemetry";

export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const RETRIEVAL_FLAG = "CAPTURE_CANDIDATE_RETRIEVAL_ENABLED";
type RouteTelemetry = {
  correlationId?: string;
  mode?: "legacy" | "retrieval";
  provider?: "free" | "openrouter";
  model?: string;
  inputLength?: number;
  profileElapsedMs?: number;
  retrievalElapsedMs?: number;
  quotaElapsedMs?: number;
  candidateAreas?: number;
  candidateProjects?: number;
  outputTasks?: number;
  outputIdeas?: number;
  outputSecondBrain?: number;
  outputSuggestions?: number;
  modelLatencyMs?: number;
  parseLatencyMs?: number;
  usagePromptTokens?: number;
  usageCompletionTokens?: number;
  usageTotalTokens?: number;
};


function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function retrievalEnabled() {
  return process.env[RETRIEVAL_FLAG] === "true";
}
async function processNoteRoute(request: Request, telemetry: RouteTelemetry) {
  const correlationId = randomUUID();
  telemetry.correlationId = correlationId;
  const user = await getUser();
  if (!user) return errorResponse("Authentication is required.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be valid JSON.", 400);
  }
  const parsedInput = processNoteInputSchema.safeParse(body);
  if (!parsedInput.success)
    return errorResponse("The note is invalid or too long.", 400);
  telemetry.inputLength = parsedInput.data.raw_note.length;

  const profileStartedAt = performance.now();
  const supabase = await createClient();
  // Profile is deliberately loaded first: auth/provider/quota decisions remain unchanged.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier, openrouter_token, openrouter_model, capture_preferences")
    .eq("id", user.id)
    .single();
  telemetry.profileElapsedMs = performance.now() - profileStartedAt;
  if (profileError || !profile)
    return errorResponse("Your account context could not be loaded.", 500);

  const useRetrieval = retrievalEnabled();
  const mode = useRetrieval ? "retrieval" : ("legacy" as const);
  telemetry.mode = mode;
  let context: {
    areas: { id: string; name: string }[];
    projects: { id: string; name: string; area_id: string }[];
    timezone: string;
    capture_preferences: ("tasks" | "ideas" | "knowledge")[];
  };
  let retrievalElapsedMs: number | undefined;

  if (useRetrieval) {
    const startedAt = performance.now();
    try {
      const result = await retrieveCaptureCandidates(
        buildCaptureCandidateQueries(parsedInput.data.raw_note),
        {},
        supabase,
      );
      retrievalElapsedMs = performance.now() - startedAt;
      telemetry.retrievalElapsedMs = retrievalElapsedMs;
      context = {
        areas: result.areas.map(({ id, name }) => ({ id, name })),
        projects: result.projects.map(({ id, name, area_id }) => ({
          id,
          name,
          area_id,
        })),
        timezone: parsedInput.data.timezone,
        capture_preferences: profile.capture_preferences?.length
          ? profile.capture_preferences
          : ["tasks", "ideas"],
      };
      } catch (error) {
        retrievalElapsedMs = performance.now() - startedAt;
        telemetry.retrievalElapsedMs = retrievalElapsedMs;
        const errorCode =
            error instanceof CaptureCandidateError ? error.code : "UNEXPECTED_ERROR";
          if (errorCode !== CAPTURE_CANDIDATE_ERROR_CODES.RPC_UNAVAILABLE) {
            logCaptureTelemetry(
              {
                event: "candidate_retrieval_rejected",
                correlationId,
                mode,
                retrievalElapsedMs,
                errorClass: errorCode,
              },
              "error",
            );
            return errorResponse("The note context could not be loaded.", 500);
          }

          // Only an unavailable RPC safely degrades to empty context.
          logCaptureTelemetry(
            {
              event: "candidate_retrieval_failed",
              correlationId,
              mode,
              retrievalElapsedMs,
              errorClass: errorCode,
            },
            "warn",
          );
          context = {
            areas: [],
            projects: [],
            timezone: parsedInput.data.timezone,
            capture_preferences: profile.capture_preferences?.length
              ? profile.capture_preferences
              : ["tasks", "ideas"],
          };
        }
  } else {
    const [
      { data: areas, error: areasError },
      { data: projects, error: projectsError },
    ] = await Promise.all([
      supabase
        .from("areas")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("projects")
        .select("id, name, area_id")
        .eq("user_id", user.id)
        .order("name"),
    ]);
    if (areasError || projectsError)
      return errorResponse("Your account context could not be loaded.", 500);
    context = {
      areas: areas ?? [],
      projects: projects ?? [],
      capture_preferences: profile.capture_preferences?.length
        ? profile.capture_preferences
        : ["tasks", "ideas"],
      timezone: parsedInput.data.timezone,
    };
  }

  let apiKey = process.env.OPENAI_API_KEY ?? "";
  let baseURL: string | undefined;
  let model = FREE_MODEL;
  const provider = profile.tier === "openrouter" ? "openrouter" : "free";

  telemetry.provider = provider;
  if (profile.tier === "openrouter") {
    if (!profile.openrouter_token || !profile.openrouter_model)
      return errorResponse(
        "OpenRouter is not configured for this account.",
        503,
      );
    try {
      apiKey = decryptOpenRouterToken(profile.openrouter_token);
    } catch {
      return errorResponse(
        "OpenRouter is not configured correctly. Please reconnect it in Settings.",
        503,
      );
    }
    baseURL = OPENROUTER_URL;
    model = profile.openrouter_model;
  } else {
    if (!apiKey) return errorResponse("AI processing is not configured.", 503);
    const quotaStartedAt = performance.now();
    const { data: usage, error: usageError } = await supabase.rpc(
      "consume_free_capture",
    );
    telemetry.quotaElapsedMs = performance.now() - quotaStartedAt;
    if (usageError || !usage?.[0])
      return errorResponse("Capture usage could not be updated.", 500);
    if (!usage[0].allowed)
      return errorResponse(
        "You used your 30 captures this month. You can capture again on the first of next month, or connect OpenRouter for unlimited captures.",
        429,
      );
  }
  telemetry.model = model;
  telemetry.retrievalElapsedMs = retrievalElapsedMs;
  telemetry.candidateAreas = context.areas.length;
  telemetry.candidateProjects = context.projects.length;
  logCaptureTelemetry({
    event: "capture_context_ready",
    correlationId,
    mode,
    inputLength: telemetry.inputLength,
    candidateAreas: context.areas.length,
    candidateProjects: context.projects.length,
    promptAreas: context.areas.length,
    promptProjects: context.projects.length,
    retrievalElapsedMs,
    profileElapsedMs: telemetry.profileElapsedMs,
    quotaElapsedMs: telemetry.quotaElapsedMs,
    model,
    provider,
  });
  try {
    const output = await processNote({
      ...parsedInput.data,
      user_context: context,
      apiKey,
      baseURL,
      model,
      onModelComplete: (details) => {
        telemetry.modelLatencyMs = details.modelLatencyMs;
        telemetry.usagePromptTokens = details.usagePromptTokens;
        telemetry.usageCompletionTokens = details.usageCompletionTokens;
        telemetry.usageTotalTokens = details.usageTotalTokens;
        logCaptureTelemetry({
          event: "capture_model_complete",
          correlationId,
          mode,
          model,
          provider,
          candidateAreas: context.areas.length,
          candidateProjects: context.projects.length,
          promptAreas: context.areas.length,
          promptProjects: context.projects.length,
          retrievalElapsedMs,
          modelLatencyMs: details.modelLatencyMs,
          usagePromptTokens: details.usagePromptTokens,
          usageCompletionTokens: details.usageCompletionTokens,
          usageTotalTokens: details.usageTotalTokens,
        });
      },
      onParseComplete: (details) => {
        telemetry.parseLatencyMs = details.parseLatencyMs;
        telemetry.outputTasks = details.outputTasks;
        telemetry.outputIdeas = details.outputIdeas;
        telemetry.outputSecondBrain = details.outputSecondBrain;
        telemetry.outputSuggestions = details.outputSuggestions;
        logCaptureTelemetry({
          event: "capture_parse_complete",
          correlationId,
          mode,
          model,
          provider,
          inputLength: telemetry.inputLength,
          candidateAreas: context.areas.length,
          candidateProjects: context.projects.length,
          parseLatencyMs: details.parseLatencyMs,
          outputTasks: details.outputTasks,
          outputIdeas: details.outputIdeas,
          outputSecondBrain: details.outputSecondBrain,
          outputSuggestions: details.outputSuggestions,
        });
      },
    });
    return NextResponse.json(output);
  } catch (error) {
    if (profile.tier === "free") {
      try {
        const admin = createAdminClient();
        const { error: refundError } = await admin.rpc("refund_free_capture", {
          p_user_id: user.id,
        });
        if (refundError)
          logCaptureTelemetry(
            {
              event: "capture_refund_failed",
              correlationId,
              mode,
              errorClass: "refund_failed",
            },
            "error",
          );
      } catch {
        logCaptureTelemetry(
          {
            event: "capture_refund_unavailable",
            correlationId,
            mode,
            errorClass: "refund_unavailable",
          },
          "error",
        );
      }
    }
    if (error instanceof ProcessNoteError)
      return errorResponse(error.message, error.status);
    return errorResponse("The note could not be processed.", 500);
  }
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  const telemetry: RouteTelemetry = {};
  let response: NextResponse | undefined;
  let thrownError: unknown;
  try {
    response = await processNoteRoute(request, telemetry);
    return response;
  } catch (error) {
    thrownError = error;
    response = errorResponse("The note could not be processed.", 500);
    return response;
  } finally {
    const isError = Boolean(thrownError || (response && response.status >= 400));
    logCaptureTelemetry(
      {
        event: "capture_complete",
        correlationId: telemetry.correlationId ?? "unknown",
        mode: telemetry.mode ?? "legacy",
        model: telemetry.model,
        provider: telemetry.provider,
        inputLength: telemetry.inputLength,
        candidateAreas: telemetry.candidateAreas,
        candidateProjects: telemetry.candidateProjects,
        profileElapsedMs: telemetry.profileElapsedMs,
        retrievalElapsedMs: telemetry.retrievalElapsedMs,
        quotaElapsedMs: telemetry.quotaElapsedMs,
        outputTasks: telemetry.outputTasks,
        outputIdeas: telemetry.outputIdeas,
        outputSecondBrain: telemetry.outputSecondBrain,
        outputSuggestions: telemetry.outputSuggestions,
        modelLatencyMs: telemetry.modelLatencyMs,
        parseLatencyMs: telemetry.parseLatencyMs,
        usagePromptTokens: telemetry.usagePromptTokens,
        usageCompletionTokens: telemetry.usageCompletionTokens,
        usageTotalTokens: telemetry.usageTotalTokens,
        totalElapsedMs: performance.now() - startedAt,
        errorClass: thrownError
          ? thrownError instanceof ProcessNoteError
            ? "process_note_error"
            : "unexpected_error"
          : response && response.status >= 400
            ? `http_${response.status}`
            : undefined,
      },
      isError ? "error" : "info",
    );
  }
}
