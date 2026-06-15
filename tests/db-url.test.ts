import { describe, expect, it } from "vitest";

import { normalizeRuntimeDatabaseUrl } from "@/lib/db";

describe("runtime database URL normalization", () => {
  it("adds Prisma pooler params for Supabase pooled URLs", () => {
    const normalized = normalizeRuntimeDatabaseUrl(
      "postgresql://user:pass@aws-1-us-west-2.pooler.supabase.com:6543/postgres",
    );

    expect(normalized).toContain("pgbouncer=true");
    expect(normalized).toContain("connection_limit=1");
    expect(normalized).toContain("sslmode=require");
  });

  it("leaves non-pooler URLs unchanged", () => {
    const url = "postgresql://user:pass@example.com:5432/postgres";

    expect(normalizeRuntimeDatabaseUrl(url)).toBe(url);
  });
});
