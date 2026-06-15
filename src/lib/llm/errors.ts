type ErrorLike = Record<string, unknown>;

const DETAIL_KEYS = [
  "code",
  "status",
  "statusCode",
  "responseBody",
  "response",
  "data",
  "cause",
];

export function formatLlmError(error: unknown) {
  if (error instanceof Error) {
    const details = formatErrorDetails(error as unknown as ErrorLike);
    return trimError(`${error.name}: ${error.message}${details ? ` | ${details}` : ""}`);
  }

  if (typeof error === "string") {
    return trimError(error);
  }

  return trimError(safeStringify(error) ?? "Unknown LLM provider error");
}

export function getLlmErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const errorLike = error as ErrorLike;
  const status = errorLike.status ?? errorLike.statusCode;

  if (typeof status === "number") {
    return status;
  }

  if (typeof status === "string") {
    const parsed = Number.parseInt(status, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function isTransientLlmError(error: unknown) {
  const status = getLlmErrorStatus(error);
  if (status && (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500)) {
    return true;
  }

  const message = formatLlmError(error).toLowerCase();
  return [
    "abort",
    "busy",
    "econnreset",
    "etimedout",
    "fetch failed",
    "gateway",
    "network",
    "overloaded",
    "rate limit",
    "timeout",
    "timed out",
    "temporarily",
    "too many requests",
  ].some((signal) => message.includes(signal));
}

function formatErrorDetails(error: ErrorLike) {
  const details: string[] = [];

  for (const key of DETAIL_KEYS) {
    const value = error[key];
    if (value == null) {
      continue;
    }

    if (value instanceof Error) {
      details.push(`${key}=${value.name}: ${value.message}`);
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      details.push(`${key}=${value}`);
      continue;
    }

    const serialized = safeStringify(value);
    if (serialized) {
      details.push(`${key}=${serialized}`);
    }
  }

  return details.join(" | ");
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function trimError(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 4000);
}
