import { describe, expect, it } from "vitest";
import { z } from "zod";

import { extractJson, parseJsonWithRepair } from "@/lib/llm/json";

const schema = z.object({
  verdict: z.enum(["pass", "fail"]),
});

describe("JSON parsing fallback", () => {
  it("extracts fenced JSON", () => {
    expect(extractJson('```json\n{"verdict":"pass"}\n```')).toBe('{"verdict":"pass"}');
  });

  it("repairs invalid JSON once", async () => {
    const result = await parseJsonWithRepair({
      rawText: "{ verdict: pass }",
      schema,
      repair: async () => '{"verdict":"pass"}',
    });

    expect(result).toEqual({
      ok: true,
      data: { verdict: "pass" },
      repaired: true,
    });
  });

  it("returns an error after failed repair", async () => {
    const result = await parseJsonWithRepair({
      rawText: "{ verdict: pass }",
      schema,
      repair: async () => "{ still: invalid }",
    });

    expect(result.ok).toBe(false);
    expect(result.repaired).toBe(true);
  });
});
