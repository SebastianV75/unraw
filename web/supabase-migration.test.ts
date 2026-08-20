import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const migration = readFileSync(new URL("../supabase/migrations/013_secure_refund_and_openrouter_model.sql", import.meta.url), "utf8")

describe("secure refund migration", () => {
  it("secures refund and updates only eligible historical defaults", () => {
    expect(migration).toMatch(/drop function if exists public\.refund_free_capture\(\);/i)
    expect(migration).toMatch(/create or replace function public\.refund_free_capture\(p_user_id uuid\)/i)
    expect(migration).toMatch(/revoke all on function public\.refund_free_capture\(uuid\) from public, anon, authenticated/i)
    expect(migration).toMatch(/grant execute on function public\.refund_free_capture\(uuid\) to service_role/i)
    expect(migration).toMatch(/update public\.profiles[\s\S]*set captures_used = greatest\(captures_used - 1, 0\)/i)
    expect(migration).toMatch(/where id = p_user_id[\s\S]*and tier = 'free'[\s\S]*and captures_used > 0/i)
    expect(migration).toMatch(/alter column openrouter_model set default 'openai\/gpt-5-nano'/i)
    expect(migration).toMatch(/update public\.profiles[\s\S]*where tier = 'free'[\s\S]*and \(openrouter_model is null or openrouter_model = 'openai\/gpt-4\.1-nano'\)/i)
  })
})
