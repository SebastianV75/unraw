const MAX_QUERIES = 8;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 200;

function normalizeWhitespace(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function stripBullet(value: string): string {
  return value.replace(/^\s*(?:[-*•‣▪◦]|\d+[.)])\s+/, "");
}

function trimPunctuation(value: string): string {
  return value
    .replace(/^[\s\p{P}]+/u, "")
    .replace(/[\s\p{P}]+$/u, "")
    .trim();
}

function bounded(value: string): string {
  if (value.length <= MAX_QUERY_LENGTH) return value;
  const cut = value.slice(0, MAX_QUERY_LENGTH + 1);
  const boundary = cut.lastIndexOf(" ");
  return (
    boundary >= MIN_QUERY_LENGTH
      ? cut.slice(0, boundary)
      : cut.slice(0, MAX_QUERY_LENGTH)
  ).trim();
}

function addCandidate(
  target: string[],
  seen: Set<string>,
  value: string,
): void {
  const candidate = bounded(trimPunctuation(normalizeWhitespace(value)));
  if (
    candidate.length < MIN_QUERY_LENGTH ||
    seen.has(candidate.toLocaleLowerCase())
  )
    return;
  seen.add(candidate.toLocaleLowerCase());
  target.push(candidate);
}

/**
 * Derives bounded lexical candidates without interpreting the note as instructions.
 * It intentionally keeps clauses/phrases ahead of individual words and never logs input.
 */
export function buildCaptureCandidateQueries(rawNote: string): string[] {
  if (typeof rawNote !== "string" || rawNote.length === 0) return [];

  const queries: string[] = [];
  const seen = new Set<string>();
  const lines = rawNote.split(/\r?\n/);

  for (const line of lines) {
    if (queries.length >= MAX_QUERIES) break;
    const cleanedLine = stripBullet(line);
    // Newlines are useful boundaries; punctuation splits clauses without reducing them to words.
    const clauses = cleanedLine.split(/[.!?;:]+(?:\s+|$)/u);
    for (const clause of clauses) {
      if (queries.length >= MAX_QUERIES) break;
      addCandidate(queries, seen, clause);
    }
  }

  // A note without useful line/sentence boundaries still gets a bounded phrase.
  if (queries.length === 0) addCandidate(queries, seen, rawNote);
  return queries.slice(0, MAX_QUERIES);
}

