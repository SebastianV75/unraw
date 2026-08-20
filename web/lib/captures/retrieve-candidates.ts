import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_AREA_LIMIT = 8;
const DEFAULT_PROJECT_LIMIT = 12;
const MAX_AREA_LIMIT = 32;
const MAX_PROJECT_LIMIT = 48;
const MAX_QUERIES = 8;
const MAX_QUERY_LENGTH = 200;

export const CAPTURE_CANDIDATE_ERROR_CODES = {
  INVALID_QUERY: "INVALID_QUERY",
  RPC_UNAVAILABLE: "RPC_UNAVAILABLE",
  RPC_REJECTED: "RPC_REJECTED",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
} as const;

export type CaptureCandidateErrorCode =
  (typeof CAPTURE_CANDIDATE_ERROR_CODES)[keyof typeof CAPTURE_CANDIDATE_ERROR_CODES];

export class CaptureCandidateError extends Error {
  constructor(public readonly code: CaptureCandidateErrorCode) {
    super(code);
    this.name = "CaptureCandidateError";
  }
}

const uuid = z.string().uuid();
const score = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().finite(),
);
const candidateRowSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("area"),
      id: uuid,
      name: z.string().min(1),
      area_id: z.null(),
      area_name: z.null(),
      score,
    })
    .strict(),
  z
    .object({
      kind: z.literal("project"),
      id: uuid,
      name: z.string().min(1),
      area_id: uuid,
      area_name: z.string().min(1),
      score,
    })
    .strict(),
]);

const captureCandidateResultSchema = z
  .object({
    areas: z.array(
      z
        .object({ id: uuid, name: z.string().min(1), score: z.number().finite() })
        .strict(),
    ),
    projects: z.array(
      z
        .object({
          id: uuid,
          name: z.string().min(1),
          area_id: uuid,
          area_name: z.string().min(1),
          score: z.number().finite(),
        })
        .strict(),
    ),
    metadata: z
      .object({
        queryCount: z.number().int().nonnegative(),
        areaCount: z.number().int().nonnegative(),
        projectCount: z.number().int().nonnegative(),
        elapsedMs: z.number().finite().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type CaptureCandidateResult = z.infer<
  typeof captureCandidateResultSchema
>;
export type CaptureCandidateQuery = string | readonly string[];
export type CaptureCandidateOptions = {
  areaLimit?: number;
  projectLimit?: number;
};

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
    ) => PromiseLike<{
      data: unknown;
      error: { code?: unknown } | null;
    }>;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function clamp(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value as number), 0), maximum);
}

function prepareQueries(input: CaptureCandidateQuery): string[] {
  const values = typeof input === "string" ? [input] : Array.from(input);
  if (values.length > MAX_QUERIES) {
    throw new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.INVALID_QUERY);
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string" || value.includes("\0") || value.length > MAX_QUERY_LENGTH) {
      throw new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.INVALID_QUERY);
    }
    const query = normalize(value);
    if (query.length < 2) {
      throw new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.INVALID_QUERY);
    }
    if (!seen.has(query)) {
      seen.add(query);
      normalized.push(query);
    }
  }
  return normalized;
}

/** Server-only lexical retrieval. It returns no catalog rows for an empty query list. */
export async function retrieveCaptureCandidates(
  input: CaptureCandidateQuery,
  options: CaptureCandidateOptions = {},
  client?: RpcClient,
): Promise<CaptureCandidateResult> {
  const queries = prepareQueries(input);
  const areaLimit = clamp(options.areaLimit, DEFAULT_AREA_LIMIT, MAX_AREA_LIMIT);
  const projectLimit = clamp(options.projectLimit, DEFAULT_PROJECT_LIMIT, MAX_PROJECT_LIMIT);
  const startedAt = performance.now();

  if (queries.length === 0 || (areaLimit === 0 && projectLimit === 0)) {
    return {
      areas: [],
      projects: [],
      metadata: {
        queryCount: queries.length,
        areaCount: 0,
        projectCount: 0,
        elapsedMs: performance.now() - startedAt,
      },
    };
  }

  let response: { data: unknown; error: { code?: unknown } | null };
  try {
    const supabase = client ?? (await createClient());
    response = await supabase.rpc("capture_candidate_retrieval", {
      p_queries: queries,
      p_area_limit: areaLimit,
      p_project_limit: projectLimit,
    });
  } catch {
    throw new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.RPC_UNAVAILABLE);
  }
  if (response.error) {
    const code =
      typeof response.error.code === "string" ? response.error.code : undefined;
    throw new CaptureCandidateError(
      code === "22023"
        ? CAPTURE_CANDIDATE_ERROR_CODES.INVALID_QUERY
        : CAPTURE_CANDIDATE_ERROR_CODES.RPC_REJECTED,
    );
  }

  let rows: z.infer<typeof candidateRowSchema>[];
  try {
    rows = z.array(candidateRowSchema).parse(response.data);
  } catch {
    throw new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.INVALID_PAYLOAD);
  }

  const areas = rows
    .filter((row) => row.kind === "area")
    .map(({ id, name, score }) => ({ id, name, score }));
  const projects = rows
    .filter((row) => row.kind === "project")
    .map(({ id, name, area_id, area_name, score }) => ({
      id,
      name,
      area_id,
      area_name,
      score,
    }));

  try {
    return captureCandidateResultSchema.parse({
      areas,
      projects,
      metadata: {
        queryCount: queries.length,
        areaCount: areas.length,
        projectCount: projects.length,
        elapsedMs: performance.now() - startedAt,
      },
    });
  } catch {
    throw new CaptureCandidateError(CAPTURE_CANDIDATE_ERROR_CODES.INVALID_PAYLOAD);
  }
}
