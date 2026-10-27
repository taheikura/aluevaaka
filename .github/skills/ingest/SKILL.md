---
name: ingest
description: "Ingest a raw source into the wiki — create summary, update entities/concepts, update manifest/index/log"
disable-model-invocation: true
---
# Ingest Source

You are a wiki maintainer operating under the conventions in [copilot-instructions.md](../../copilot-instructions.md).

The user will specify a file path inside `raw/`. Your job is to ingest it into the wiki.

## Steps

1. **Read the manifest** at `wiki/manifest.md` to check if this file has already been processed. If it has, ask the user whether they want to reprocess it.

2. **Read the source file** completely. If it is a PDF or binary format, ask the user if they have a markdown conversion available. Otherwise, extract what you can.

3. **Detect the source language.** This determines the wiki page language:
   - English source → English wiki page.
   - Simplified Chinese source → Simplified Chinese wiki page.
   - Traditional Chinese source → **Simplified Chinese** wiki page. Convert all Traditional Chinese to Simplified Chinese during ingest.
   - Page titles, section headings, and body text all follow the source language (with the Traditional → Simplified conversion). Tags and frontmatter field names/values (except `title` and `aliases`) are always in English.

4. **Discuss before writing.** Summarize the 3-5 most important takeaways from the source and present them to the user. Use the same language as the source (Simplified Chinese for any Chinese source). Ask:
   - "Are these the right takeaways? Anything I should emphasize or de-emphasize?"
   - Wait for confirmation before proceeding.

5. **Read the wiki index** at `wiki/index.md` to understand what already exists in the wiki.

6. **Create a source summary page** at `wiki/sources/{Source Title}.md` — where `{Source Title}` is the human-readable title (with spaces, not slugified). **The filename must exactly match the `title` frontmatter field.** This is critical for wikilink resolution in Obsidian. For Chinese sources, the title and filename are in Simplified Chinese. Follow this structure:
   - Opening paragraph (what, who, when, why it matters)
   - `## Key Takeaways` — 5-10 bullet points
   - `## Detailed Notes` — section-by-section breakdown
   - `## Entities & Concepts Referenced` — wikilinks
   - `## Quotes & Data Points` — specific facts worth preserving
   - Include proper YAML frontmatter with all required fields.

7. **Create or update entity pages** in `wiki/entities/` for people, organizations, systems, or tools mentioned in the source. If a page exists, *integrate* new information into the existing text — do not just append. If a page doesn't exist, create a stub with `status: stub`. Match the language of the source (Chinese entity from a Chinese source gets a Chinese page).

8. **Create or update concept pages** in `wiki/concepts/` for key ideas, methodologies, or principles. Same integration rule: revise existing pages, don't append. Same language rule.

9. **Update `wiki/manifest.md`** — mark this file as `processed` with today's date, mode `full`, and list the wiki pages created or updated.

10. **Update `wiki/index.md`** — add entries for new pages, update descriptions for modified pages. Update the page and source counts.

11. **Append to `wiki/log.md`** using this format:
    ```
    ## [YYYY-MM-DD] ingest | {Source Title}
    - Source: `{path to raw file}`
    - Pages created: [[Page1]], [[Page2]]
    - Pages updated: [[Page3]] (brief description of change)
    - Contradictions found: {describe or "none"}
    - Open questions: {list or "none"}
    ```

12. **Report** a summary of all changes to the user.

## Important

- **Filenames must match titles exactly.** If the title is "Transformer Architecture", the file is `Transformer Architecture.md`, not `transformer-architecture.md`. This is the #1 cause of broken wikilinks.
- **Chinese sources → Simplified Chinese wiki pages.** Traditional Chinese must be converted to Simplified Chinese. English sources stay English. Tags and frontmatter enums are always in English regardless of page language.
- When a new source contradicts an existing wiki page, do NOT silently overwrite. Add a `> [!warning] Contradiction` callout and set `confidence: contested`.
- Use `[[wikilinks]]` for all cross-references, not markdown links.
- Preserve exact wording in quotes for technical definitions or primary source text.
- Every wiki page must have complete YAML frontmatter per the schema.
