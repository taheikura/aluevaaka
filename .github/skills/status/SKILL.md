---
name: status
description: "Show processing status across all raw/ folders — what's been ingested, what hasn't, and wiki health at a glance"
disable-model-invocation: true
---
# Wiki Status

You are a wiki maintainer operating under the conventions in [copilot-instructions.md](../../copilot-instructions.md).

Give the user a dashboard view of the wiki's current state.

## Steps

1. **Scan `raw/` recursively.** List every directory that contains source files (exclude `assets/` directories at any level). Include nested folders using their full path.

2. **Read `wiki/manifest.md`.**

3. **Present a folder status table:**

   ```
   | Folder                   | Total | Processed | Unprocessed | Last ingested |
   |--------------------------|-------|-----------|-------------|---------------|
   | raw/articles/            | 5     | 3         | 2           | 2026-04-05    |
   | raw/books/ddia/          | 12    | 8         | 4           | 2026-04-03    |
   | raw/my-topic/sub-topic/  | 3     | 0         | 3           | —             |
   ```

4. **Flag any discrepancies:**
   - Folders in `raw/` that have no section in the manifest (newly created folders).
   - Files in the manifest marked as `processed` but whose raw file no longer exists.
   - Files that were processed with `mode: connect-only` (no source summary — user may want a full ingest later).

5. **Present wiki summary stats:**
   - Total wiki pages (entities, concepts, sources, analyses — broken out)
   - Pages by status (stub / draft / mature)
   - Most recently updated pages (top 5)
   - Last log entry date

6. **Suggest next actions** based on what you see:
   - "You have 4 unprocessed files in `raw/books/ddia/` — want me to process them?"
   - "The wiki has 8 stubs that might be ready for promotion — want me to run a lint?"
   - "No new sources since last week — consider adding recent articles on {topic}?"

## Important

- Keep the output concise. This is a dashboard, not a report.
- Don't read the full content of every wiki page — just scan filenames, frontmatter, and the manifest.
- If `wiki/manifest.md` doesn't exist yet, say so and offer to create it by scanning `raw/`.
