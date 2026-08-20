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

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function retrievalEnabled() {
  return process.env[RETRIEVAL_FLAG] === "true";
}

export async function POST(request: Request) {
  const correlationId = randomUUID();
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

  const supabase = await createClient();
  // Profile is deliberately loaded first: auth/provider/quota decisions remain unchanged.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier, openrouter_token, openrouter_model")
    .eq("id", user.id)
    .single();
  if (profileError || !profile)
    return errorResponse("Your account context could not be loaded.", 500);

  const useRetrieval = retrievalEnabled();
  const mode = useRetrieval ? "retrieval" : ("legacy" as const);
  let context: {
    areas: { id: string; name: string }[];
    projects: { id: string; name: string; area_id: string }[];
    timezone: string;
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
      context = {
        areas: result.areas.map(({ id, name }) => ({ id, name })),
        projects: result.projects.map(({ id, name, area_id }) => ({
          id,
          name,
          area_id,
        })),
        timezone: parsedInput.data.timezone,
      };
        } catch (error) {
          retrievalElapsedMs = performance.now() - startedAt;
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
      timezone: parsedInput.data.timezone,
    };
  }

  let apiKey = process.env.OPENAI_API_KEY ?? "";
  let baseURL: string | undefined;
  let model = FREE_MODEL;
  const provider = profile.tier === "openrouter" ? "openrouter" : "free";

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
    const { data: usage, error: usageError } = await supabase.rpc(
      "consume_free_capture",
    );
    if (usageError || !usage?.[0])
      return errorResponse("Capture usage could not be updated.", 500);
    if (!usage[0].allowed)
      return errorResponse(
        "You used your 30 captures this month. You can capture again on the first of next month, or connect OpenRouter for unlimited captures.",
        429,
      );
  }

  logCaptureTelemetry({
    event: "capture_context_ready",
    correlationId,
    mode,
    candidateAreas: context.areas.length,
    candidateProjects: context.projects.length,
    promptAreas: context.areas.length,
    promptProjects: context.projects.length,
    retrievalElapsedMs,
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
      onModelComplete: (details) =>
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
        }),
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
