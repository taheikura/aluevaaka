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

function retryDelayMilliseconds(retryAfter: string | undefined, attempt: number): number {
  if (retryAfter !== undefined) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 15 * 60 * 1000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, Math.min(date - Date.now(), 15 * 60 * 1000));
  }
  return Math.min(1000 * 2 ** attempt, 30 * 1000);
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, init);
    if (response.ok) return response;
    if (!isRetryable(response.status) || attempt === 3) throw requestError(response, url);
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        retryDelayMilliseconds(response.headers.get('retry-after') ?? undefined, attempt),
      ),
    );
  }
  throw new Error(`HTTP request failed after retries: ${url}`);
}

export async function fetchText(url: string): Promise<string> {
  return (await fetchWithRetry(url)).text();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return (await fetchWithRetry(url, init)).json() as Promise<T>;
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
