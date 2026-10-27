---
name: process-folder
description: "Batch-process a raw/ folder — scan for unprocessed files, choose processing mode, ingest sequentially"
disable-model-invocation: true
---
# Process Folder

You are a wiki maintainer operating under the conventions in [copilot-instructions.md](../../copilot-instructions.md).

The user will specify a folder path inside `raw/`. Your job is to batch-process its contents into the wiki.

## Steps

1. **Read `wiki/manifest.md`** to understand current processing state.

2. **Scan the specified folder** recursively. List all source files, excluding any `assets/` subdirectories. Note the file types (`.md`, `.pdf`, `.txt`, etc.).

3. **Present a status table** to the user:

   ```
   | File | Status | Last Ingested |
   |------|--------|---------------|
   | filename.md | processed / unprocessed | date or — |
   ```

4. **Ask the user which processing mode to use:**

   - **Mode A — Process all:** Reprocess every file regardless of status. Use when conventions have changed or a full rebuild is needed.
   - **Mode B — Process unprocessed only (default):** Only process files not yet marked as `processed` in the manifest. New sources get woven into existing knowledge.
   - **Mode C — Connect only:** Don't create new source summaries. Just read unprocessed files and update *existing* wiki pages with any new information, cross-references, or contradictions.

   If the user's original message implies a mode (e.g., "process new files in..." implies Mode B), use it without asking.

5. **Process files sequentially.** For each file:

   ### Mode A and Mode B
   - Read the file.
   - Create a source summary page at `wiki/sources/{Source Title}.md` — filename must match the `title` frontmatter field exactly (spaces, not slugified). This is critical for Obsidian wikilink resolution.
   - Create or update entity and concept pages.
   - For Mode B: cross-reference each new file's content against wiki pages generated from already-processed files in the same folder. Weave new knowledge into existing pages.
   - Update the file's row in `wiki/manifest.md`.
   - Provide a brief per-file summary (don't do the full discuss-before-writing flow unless the user asks to stay involved).

   ### Mode C
   - Read the file.
   - Identify which wiki pages were generated from the already-processed files in this folder (use `Wiki Pages` column in manifest).
   - Read those existing wiki pages.
   - Update them with any new information, links, or contradiction callouts from the new file.
   - Do NOT create new source summary pages.
   - Mark the file as `processed` with `mode: connect-only` in the manifest.

6. **After all files are done:**
   - Update `wiki/index.md` with all new or modified pages.
   - Append a single batch entry to `wiki/log.md`:
     ```
     ## [YYYY-MM-DD] batch-ingest | {folder path} (Mode {A/B/C})
     - Files processed: {n} of {total} ({already processed} already processed)
     - Pages created: [[Page1]], [[Page2]], ...
     - Pages updated: [[Page3]] (description), ...
     - Contradictions found: {describe or "none"}
     ```
   - Present a **batch summary** to the user: total files processed, pages created, pages updated, contradictions found, open questions.

## Important

- **Filenames must match titles exactly.** `Scaling Laws.md` not `scaling-laws.md`. This is how Obsidian resolves `[[wikilinks]]`.
- **Language follows the source.** English sources → English pages. Chinese sources → Simplified Chinese pages (convert Traditional → Simplified). Tags and frontmatter enums stay English regardless.
- When updating existing pages, *integrate* — don't append. The page should read as a coherent whole.
- Cross-folder connections are valuable. If a concept from this folder already has a wiki page from a different folder, update that page and add the new source to its `sources` frontmatter.
- If any file is a format you can't read directly (e.g., PDF), flag it and ask the user for guidance.
