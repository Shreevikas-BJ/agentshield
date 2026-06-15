import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  GROQ_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ENABLE_OPENAI_FINAL_JUDGE: z
    .enum(["true", "false"])
    .optional()
    .default("false"),
  GROQ_MODEL: z.string().min(1).optional().default("llama-3.1-8b-instant"),
  GEMINI_MODEL: z.string().min(1).optional().default("gemini-2.5-flash"),
  OPENAI_FINAL_JUDGE_MODEL: z.string().min(1).optional().default("gpt-5"),
});

export function getEnv() {
  return envSchema.parse(process.env);
}

export function isOpenAIFinalJudgeEnabled(env = getEnv()) {
  return env.ENABLE_OPENAI_FINAL_JUDGE === "true" && Boolean(env.OPENAI_API_KEY);
}

export function hasDatabaseUrl(env = getEnv()) {
  return Boolean(env.DATABASE_URL);
}
