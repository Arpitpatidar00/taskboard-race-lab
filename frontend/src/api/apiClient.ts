import type { ApiError } from "@/types/task";

const BASE_URL = "/api";

/**
 * Typed API client with AbortController support and idempotency-key injection.
 * Also includes race-condition logging.
 */

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    public body: ApiError
  ) {
    super(body.error.message);
    this.name = "ApiRequestError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  idempotencyKey?: string;
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, signal, idempotencyKey } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const errorBody = (await response.json()) as ApiError;
    throw new ApiRequestError(response.status, errorBody);
  }

  return response.json() as Promise<T>;
}
