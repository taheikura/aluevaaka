/**
 * Minimal fetch wrapper for the data pipeline.
 * Node 20 has native fetch — no extra deps needed.
 */

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
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
