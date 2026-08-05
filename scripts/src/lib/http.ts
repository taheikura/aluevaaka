/**
 * Minimal fetch wrapper for the data pipeline.
 * Node 24 has native fetch — no extra deps needed.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly retryAfter?: string,
  ) {
    super(`HTTP ${status} fetching ${url}`);
    this.name = 'HttpError';
  }
}

function requestError(response: Response, url: string): HttpError {
  return new HttpError(response.status, url, response.headers.get('retry-after') ?? undefined);
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw requestError(res, url);
  }
  return res.text();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw requestError(res, url);
  }
  return res.json() as Promise<T>;
}

/** Parse a CSV string into an array of objects keyed by header row. */
export function parseCsv(text: string, delimiter = ','): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? '').split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}
