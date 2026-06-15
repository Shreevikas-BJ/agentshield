import { describe, expect, it } from "vitest";

import { getBackoffDelayMs, retryWithBackoff } from "@/lib/llm/retry";

describe("retryWithBackoff", () => {
  it("retries transient failures with exponential backoff", async () => {
    const delays: number[] = [];
    let attempts = 0;
    const rateLimitError = Object.assign(new Error("too many requests"), { status: 429 });

    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw rateLimitError;
        }
        return "ok";
      },
      {
        baseDelayMs: 100,
        maxDelayMs: 500,
        sleep: async (ms) => {
          delays.push(ms);
        },
      },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(delays).toEqual([100, 200]);
  });

  it("does not retry non-transient provider errors", async () => {
    let attempts = 0;
    const badRequest = Object.assign(new Error("invalid request"), { status: 400 });

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw badRequest;
        },
        {
          sleep: async () => undefined,
        },
      ),
    ).rejects.toThrow("invalid request");

    expect(attempts).toBe(1);
  });

  it("caps exponential backoff delays", () => {
    expect(getBackoffDelayMs(4, 500, 1_000)).toBe(1_000);
  });
});
