import type { ApiError } from '@aluevaaka/schemas';

/**
 * Concrete response shape returned by all handlers.
 * Using our own type instead of LambdaFunctionURLResult avoids the
 * `string | structured` union which makes tests awkward to type.
 */
export interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

export function corsHeaders(origin: string | undefined): Record<string, string> {
  // Only echo back origins explicitly listed in ALLOWED_ORIGINS env var.
  // Falls back to a safe empty string if origin is not allowed.
  const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
  const allowedOrigin = origin && allowed.includes(origin) ? origin : '';

  return allowedOrigin
    ? {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    : {};
}

export function ok(body: unknown, origin?: string): HandlerResponse {
  void origin;
  return {
    statusCode: 200,
    headers: BASE_HEADERS,
    body: JSON.stringify(body),
  };
}

export function error(statusCode: number, payload: ApiError, origin?: string): HandlerResponse {
  void origin;
  return {
    statusCode,
    headers: BASE_HEADERS,
    body: JSON.stringify(payload),
  };
}

export function noContent(origin?: string): HandlerResponse {
  return {
    statusCode: 204,
    headers: corsHeaders(origin),
    body: '',
  };
}
