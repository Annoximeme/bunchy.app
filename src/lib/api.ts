/**
 * Client-side API helper.
 *
 * Turns the error envelope from `src/server/http/route.ts` back into a typed
 * exception, so every component handles failure the same way instead of each
 * one inventing its own `res.ok` check. Network failures and server errors
 * arrive as the same `ApiError`, because from the UI's point of view they are
 * the same situation: it didn't work, tell the person something true.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = init;

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...rest.headers,
      },
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    });
  } catch {
    throw new ApiError(
      "network",
      "We couldn't reach Bunchy. Check your connection and try again.",
      0,
    );
  }

  if (!response.ok) {
    let payload: ErrorEnvelope = {};
    try {
      payload = (await response.json()) as ErrorEnvelope;
    } catch {
      // Non-JSON error body (a proxy error page, say). The status still helps.
    }
    throw new ApiError(
      payload.error?.code ?? "internal",
      payload.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      payload.error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
