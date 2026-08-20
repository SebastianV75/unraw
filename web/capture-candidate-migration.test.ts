import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const sql = readFileSync(new URL("../supabase/migrations/014_capture_candidate_retrieval.sql", import.meta.url), "utf8")

describe("capture candidate retrieval migration", () => {
  it("is authenticated, invoker, fixed-search-path, and explicitly granted", () => {
    expect(sql).toMatch(/security invoker/i)
    expect(sql).toMatch(/set search_path = pg_catalog, public, extensions/i)
    expect(sql).toMatch(/revoke all on function public\.capture_candidate_retrieval\(text\[\], integer, integer\)[\s\S]*from public, anon/i)
    expect(sql).toMatch(/grant execute on function public\.capture_candidate_retrieval\(text\[\], integer, integer\)[\s\S]*to authenticated/i)
    expect(sql).toMatch(/auth\.uid\(\)\s+is not null|auth\.uid\(\)/i)
  })

  it("guards cardinality and invalid input before expensive query work", () => {
    const guard = sql.indexOf("if cardinality(p_queries) > 8")
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(sql.indexOf("unnest(p_queries)"))
    expect(sql).toMatch(/length\(v_query\) > 200/)
    expect(sql).toMatch(/position\('00' in encode\(convert_to\(v_query, 'UTF8'\), 'hex'\)\)/)
    expect(sql).toMatch(/length\(public\.normalize_unified_search_text\(v_query\)\) < 2/)
  })

  it("preserves ordinal first occurrence, bounds each query, then global-ranks", () => {
    expect(sql).toMatch(/with ordinality/i)
    expect(sql).toMatch(/distinct on \(query\)[\s\S]*order by query, ordinality/i)
    expect(sql).toMatch(/partition by am\.query[\s\S]*order by am\.score desc, lower\(am\.name\), am\.id[\s\S]*query_rank/)
    expect(sql).toMatch(/partition by pm\.query[\s\S]*order by pm\.score desc, lower\(pm\.name\), pm\.id[\s\S]*query_rank/)
    expect(sql).toMatch(/where ap\.query_rank <= 32/)
    expect(sql).toMatch(/where pm\.query_rank <= 48/)
    expect(sql).toMatch(/ranked_projects as \(\s*select dp\.\*, row_number\(\) over \(\s*order by dp\.score desc, lower\(dp\.name\), dp\.id\s*\) as global_rank/i)
    expect(sql).toMatch(/ranked_areas as \(\s*select da\.\*, row_number\(\) over \(\s*order by da\.score desc, lower\(da\.name\), da\.id\s*\) as global_rank/i)
  })

  it("uses migration 012 generated search columns and tenant/status filters", () => {
    expect(sql).toMatch(/from public\.areas a[\s\S]*where a\.user_id = auth\.uid\(\)/i)
    expect(sql).toMatch(/from public\.projects p[\s\S]*join public\.areas a\s+on a\.id = p\.area_id and a\.user_id = auth\.uid\(\)[\s\S]*where p\.user_id = auth\.uid\(\)/i)
    expect(sql).toMatch(/where p\.user_id = auth\.uid\(\)[\s\S]*p\.status = 'active'/i)
    expect(sql).toMatch(/least\(greatest\(coalesce\(p_area_limit, 8\), 0\), 32\)/i)
    expect(sql).toMatch(/least\(greatest\(coalesce\(p_project_limit, 12\), 0\), 48\)/i)
    expect(sql).toMatch(/when a\.search_text = r\.query then 100/i)
    expect(sql).toMatch(/when left\(a\.search_text, length\(r\.query\)\) = r\.query then 80/i)
    expect(sql).toMatch(/when position\(a\.search_text in r\.query\) > 0 then 75/i)
    expect(sql).toMatch(/position\(a\.search_text in r\.query\) > 0[\s\S]*or extensions\.similarity\(a\.search_text, r\.query\) >= 0\.25/i)
    expect(sql).toMatch(/50 \+ \(extensions\.similarity\(a\.search_text, r\.query\) \* 20\)/i)
    expect(sql).toMatch(/then 100[\s\S]*then 80[\s\S]*then 75[\s\S]*50 \+ \(extensions\.similarity\(a\.search_text, r\.query\) \* 20\)/i)
    expect(sql).toMatch(/when p\.search_text = r\.query then 100/i)
    expect(sql).toMatch(/when left\(p\.search_text, length\(r\.query\)\) = r\.query then 80/i)
    expect(sql).toMatch(/when position\(p\.search_text in r\.query\) > 0 then 75/i)
    expect(sql).toMatch(/position\(p\.search_text in r\.query\) > 0[\s\S]*or extensions\.similarity\(p\.search_text, r\.query\) >= 0\.25/i)
    expect(sql).toMatch(/50 \+ \(extensions\.similarity\(p\.search_text, r\.query\) \* 20\)/i)
    expect(sql).toMatch(/then 100[\s\S]*then 80[\s\S]*then 75[\s\S]*50 \+ \(extensions\.similarity\(p\.search_text, r\.query\) \* 20\)/i)
    expect(sql).toMatch(/parent_areas[\s\S]*union all[\s\S]*ranked_areas/i)
    expect(sql).not.toMatch(/select \* from public\.(areas|projects)/i)
  })

  it("caps total area output after direct and parent deduplication", () => {
    expect(sql).toMatch(/all_areas[\s\S]*deduped_areas[\s\S]*ranked_areas[\s\S]*ra\.global_rank <= b\.area_limit/i)
    expect(sql).toMatch(/select 'project'[\s\S]*rp\.area_id[\s\S]*rp\.area_name/i)
  })
})
