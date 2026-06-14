import type { z } from "zod";

type ParseOptions<T> = {
  rawText: string;
  schema: z.ZodType<T>;
  repair?: (invalidJson: string, error: string) => Promise<string>;
};

export type JsonParseResult<T> =
  | { ok: true; data: T; repaired: boolean }
  | { ok: false; error: string; repaired: boolean; rawText: string };

export async function parseJsonWithRepair<T>({
  rawText,
  schema,
  repair,
}: ParseOptions<T>): Promise<JsonParseResult<T>> {
  const first = parseCandidate(rawText, schema);
  if (first.ok) {
    return { ...first, repaired: false };
  }

  if (!repair) {
    return {
      ok: false,
      error: first.error,
      repaired: false,
      rawText,
    };
  }

  const repairedText = await repair(rawText, first.error);
  const second = parseCandidate(repairedText, schema);

  if (second.ok) {
    return { ...second, repaired: true };
  }

  return {
    ok: false,
    error: second.error,
    repaired: true,
    rawText: repairedText,
  };
}

function parseCandidate<T>(
  rawText: string,
  schema: z.ZodType<T>,
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    return { ok: true, data: schema.parse(parsed) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown JSON parsing error",
    };
  }
}

export function extractJson(rawText: string) {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1);
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    return trimmed.slice(firstArray, lastArray + 1);
  }

  return trimmed;
}
