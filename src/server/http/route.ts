import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, isAppError } from "@/server/errors";
import { requireViewer, type Viewer } from "@/server/auth/current-user";
import { env } from "@/server/env";

/**
 * The single place where domain errors become HTTP responses.
 *
 * Route handlers stay three lines long: parse, call a service, return. Anything
 * thrown below is translated here, so no handler needs its own try/catch and no
 * service needs to know what a status code is.
 */

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "Some of those details need another look.",
          details: z.treeifyError(error),
        },
      },
      { status: 422 },
    );
  }

  // Unexpected: log the real thing, tell the client nothing useful to an attacker.
  console.error("Unhandled route error:", error);
  return NextResponse.json(
    {
      error: {
        code: "internal",
        message: "Something went wrong on our end.",
        ...(env().NODE_ENV === "development" && error instanceof Error
          ? { details: error.message }
          : {}),
      },
    },
    { status: 500 },
  );
}

type Handler<T> = () => Promise<T>;

/** Wraps a handler body so thrown domain errors become proper responses. */
export async function handle<T>(
  fn: Handler<T>,
): Promise<NextResponse<T | ApiErrorBody>> {
  try {
    return NextResponse.json(await fn());
  } catch (error) {
    return errorResponse(error);
  }
}

/** Same, but resolves the viewer first and fails with 401 when absent. */
export async function handleAuthed<T>(
  fn: (viewer: Viewer) => Promise<T>,
): Promise<NextResponse<T | ApiErrorBody>> {
  try {
    return NextResponse.json(await fn(await requireViewer()));
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Parses a JSON body against a schema. Treats a malformed body as a validation
 * error rather than letting a SyntaxError bubble up as a 500.
 */
export async function parseJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("validation_failed", "Expected a JSON body.");
  }
  return schema.parse(raw);
}

export function parseQuery<S extends z.ZodType>(
  request: Request,
  schema: S,
): z.output<S> {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) raw[key] = value;
  return schema.parse(raw);
}
