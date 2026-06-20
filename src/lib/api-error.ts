import { NextResponse } from "next/server";

/**
 * Standardized API error responses.
 * In production, internal error details are hidden from the client.
 */

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function tooManyRequests() {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

export function internalError(error: unknown) {
  const message =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Internal server error";

  if (error instanceof Error) {
    console.error("[API Error]", error.message);
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Wraps an API route handler with try-catch error handling.
 * Usage: export const GET = withErrorHandler(async (request) => { ... });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
): (...args: Parameters<T>) => Promise<Response> {
  return async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      return internalError(error);
    }
  };
}

/** Wraps a Supabase error into a standardized 500 response */
export function supabaseError(error: { message: string }) {
  console.error("[Supabase Error]", error.message);
  const message =
    process.env.NODE_ENV === "development"
      ? error.message
      : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
