import { describe, expect, it } from "vitest";

import { envSchema, isOpenAIFinalJudgeEnabled } from "@/lib/env";

describe("environment handling", () => {
  it("defaults OpenAI final judge to disabled", () => {
    const env = envSchema.parse({});

    expect(env.ENABLE_OPENAI_FINAL_JUDGE).toBe("false");
    expect(env.GROQ_MODEL).toBe("llama-3.1-8b-instant");
    expect(isOpenAIFinalJudgeEnabled(env)).toBe(false);
  });

  it("requires both flag and key for OpenAI final judge", () => {
    const disabled = envSchema.parse({
      ENABLE_OPENAI_FINAL_JUDGE: "true",
    });
    const enabled = envSchema.parse({
      ENABLE_OPENAI_FINAL_JUDGE: "true",
      OPENAI_API_KEY: "test-openai-key",
    });

    expect(isOpenAIFinalJudgeEnabled(disabled)).toBe(false);
    expect(isOpenAIFinalJudgeEnabled(enabled)).toBe(true);
  });
});
