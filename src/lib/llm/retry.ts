import { isTransientLlmError } from "@/lib/llm/errors";

type RetryContext = {
  attempt: number;
  signal?: AbortSignal;
};

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

export class LlmTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`LLM call timed out after ${timeoutMs}ms`);
    this.name = "LlmTimeoutError";
  }
}

export async function retryWithBackoff<T>(
  operation: (context: RetryContext) => Promise<T>,
  {
    attempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 4_000,
    timeoutMs = 20_000,
    sleep = delay,
    shouldRetry = isTransientLlmError,
    onRetry,
  }: RetryOptions = {},
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new LlmTimeoutError(timeoutMs));
        }, timeoutMs);
      });

      return await Promise.race([operation({ attempt, signal: controller.signal }), timeout]);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = getBackoffDelayMs(attempt, baseDelayMs, maxDelayMs);
      onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError;
}

export function getBackoffDelayMs(attempt: number, baseDelayMs = 500, maxDelayMs = 4_000) {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
}

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
