# LLM Wiki — Copilot Instructions

> This file configures GitHub Copilot as a **wiki maintainer** for a personal knowledge base.
> Obsidian is the reader. VS Code + Copilot is the writer. The wiki is the artifact.
>
> Pattern credit: [Karpathy, "LLM Wiki" (2026)](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

---

## 1. Architecture

```
llm-wiki/
├── raw/                        # IMMUTABLE source documents — never modify
│   ├── articles/               # (fixed) web clips via Obsidian Web Clipper
│   ├── books/                  # (fixed) chapter-level reading notes
│   ├── transcripts/            # (fixed) meeting notes, podcast transcripts
│   ├── {user-topic}/           # user-created topic folders (any name)
│   │   ├── {sub-topic}/        # nesting is allowed to any depth
│   │   │   ├── source-a.md
│   │   │   └── source-b.pdf
│   │   ├── source-c.md
│   │   └── assets/             # downloaded images for this topic's sources
│   └── assets/                 # shared images not tied to a single topic
│
├── wiki/                       # LLM-GENERATED — Copilot owns this layer entirely
│   ├── entities/               # pages for people, organizations, systems, tools
│   ├── concepts/               # ideas, frameworks, methodologies, principles
│   ├── sources/                # one summary page per ingested source
│   ├── analyses/               # filed query results, comparisons, syntheses
│   ├── manifest.md             # processing state tracker (see §4)
│   ├── index.md                # master catalog of all wiki pages
│   └── log.md                  # chronological record of all operations
│
├── templates/                  # Obsidian templates for manual page creation
│   ├── source-summary.md
│   ├── entity-page.md
│   └── concept-page.md
│
├── .github/
│   └── copilot-instructions.md # THIS FILE — the schema layer
│
└── .obsidian/                  # Obsidian config (do not touch)
```

### Folder rules

- **`raw/`** is read-only. Never create, modify, or delete files here. This is the source of truth.
- **Fixed folders** (`articles/`, `books/`, `transcripts/`) have reserved names for common source types. The user may or may not use all of them.
- **Topic folders** are created by the user, not by Copilot. Names are freeform — no naming convention enforced. **Nesting is supported** to any depth (e.g., `raw/research/ml/transformers/`). Copilot treats the full path as the folder identity in the manifest.
- **`assets/`** directories at any level hold images and are excluded from source file scans.
- **`wiki/`** is Copilot's workspace. All generated content lives here. Create, update, and reorganize freely.
- **`wiki/manifest.md`** tracks which raw files have been processed. Copilot owns this file. See §4.
- **`templates/`** contains Obsidian templates. Read them to understand page structure; do not modify.
- **`.obsidian/`** is off-limits.

---

## 2. Page Format

Every wiki page uses this frontmatter schema. Obsidian Dataview queries depend on these fields.

```yaml
---
title: "Page Title"
type: entity | concept | source | analysis
aliases:
  - "Alternative Name"
  - "Abbreviation"
tags:
  - topic/your-topic
  - type/article
created: 2026-04-07
updated: 2026-04-07
sources:
  - "[[raw/folder/source-filename]]"
confidence: high | medium | low | contested
status: stub | draft | mature
---
```

### Field definitions

| Field | Required | Notes |
|-------|----------|-------|
| `title` | Yes | Human-readable title |
| `type` | Yes | One of: `entity`, `concept`, `source`, `analysis` |
| `aliases` | No | Alternative names, abbreviations. Enables Obsidian search |
| `tags` | Yes | Hierarchical tags. See §7 for taxonomy conventions |
| `created` | Yes | ISO date of page creation |
| `updated` | Yes | ISO date of last substantive edit. **Update this on every edit** |
| `sources` | Yes | Wikilinks to raw sources that inform this page |
| `confidence` | Yes | Epistemic status. `contested` means sources disagree |
| `status` | Yes | `stub` = placeholder, `draft` = partial, `mature` = comprehensive |

### File naming convention

**CRITICAL: The filename must exactly match the `title` frontmatter field, with `.md` appended.** This ensures wikilinks resolve correctly in Obsidian.

| Title in frontmatter | Filename | Wikilink |
|-----------------------|----------|----------|
| `"Transformer Architecture"` | `Transformer Architecture.md` | `[[Transformer Architecture]]` |
| `"Scaling Laws"` | `Scaling Laws.md` | `[[Scaling Laws]]` |
| `"DDIA Ch01 Summary"` | `DDIA Ch01 Summary.md` | `[[DDIA Ch01 Summary]]` |

Rules:
- **Use the human-readable title as the filename.** Spaces are fine — Obsidian handles them natively.
- **Do NOT slugify.** Never create `transformer-architecture.md` when the title is "Transformer Architecture". This is the #1 cause of broken wikilinks.
- **Avoid special characters** that are illegal in filenames: `/ \ : * ? " < > |`. Colons are common in titles — replace them with ` —` or remove them.
- **Page titles must be unique across the entire wiki.** Since Obsidian resolves wikilinks by shortest path, two files named `Overview.md` in different folders would create ambiguity. Use specific titles: `ORE Overview.md` not `Overview.md`.
- **The `aliases` field is for alternative names**, not for fixing filename mismatches. Use it for abbreviations and synonyms (e.g., `aliases: ["GAN", "GANs"]` on a page titled "Generative Adversarial Network").

### Language conventions

Wiki pages inherit the language of their source material, with one normalization rule for Chinese:

| Source language | Wiki page language | Page title language |
|----------------|-------------------|-------------------|
| English | English | English |
| Simplified Chinese (简体中文) | Simplified Chinese | Simplified Chinese |
| Traditional Chinese (繁體中文) | **Simplified Chinese** (convert) | Simplified Chinese |
| Mixed (e.g., English paper with Chinese annotations) | Follow the dominant language of the source | Match page body language |

Rules:
- **English sources produce English wiki pages.** Section headings, body text, frontmatter `title` — all in English.
- **Chinese sources produce Simplified Chinese wiki pages.** All content — title, section headings, body text — in Simplified Chinese (简体中文).
- **Traditional Chinese must be converted to Simplified Chinese.** If a raw source is in 繁體中文, the wiki page must be written entirely in 简体中文. Convert all text during ingest — do not preserve Traditional Chinese in the wiki layer.
- **Wikilinks and aliases handle cross-language references.** If a Chinese page references an English concept (or vice versa), use an aliased wikilink: `[[Transformer Architecture|Transformer 架构]]`. Add the cross-language name as an `alias` in the target page's frontmatter so both languages resolve.
- **Tags are always in English**, regardless of page language. Tags are structural metadata, not content — keeping them in English ensures consistent Dataview queries across languages.
- **Frontmatter fields other than `title` and `aliases` are always in English.** Field names (`type`, `status`, `confidence`, etc.) and their enum values (`high`, `stub`, `entity`, etc.) stay in English.

### Body conventions

- **Use Obsidian wikilinks** (`[[Page Name]]`) for all cross-references, not markdown links.
- **Use aliased links** when the page name is unwieldy: `[[Distributed Systems Consensus Algorithms|consensus algorithms]]`.
- **Section structure** for entity/concept pages:
  1. One-paragraph definition/summary (no heading — it's the opening)
  2. `## Key Points` — bullet list of the most important facts
  3. `## Details` — longer exposition, organized by sub-topic
  4. `## Connections` — how this relates to other wiki pages (explicit wikilinks)
  5. `## Open Questions` — what remains unclear, contradictory, or uninvestigated
  6. `## Sources` — list of `[[raw/...]]` links with brief annotation per source
- **Section structure** for source summary pages:
  1. Opening paragraph: what this source is, who wrote it, when, why it matters
  2. `## Key Takeaways` — 5-10 bullet points
  3. `## Detailed Notes` — section-by-section or chapter-by-chapter breakdown
  4. `## Entities & Concepts Referenced` — wikilinks to existing or newly created pages
  5. `## Quotes & Data Points` — specific facts, numbers, quotes worth preserving (with page/section refs)
- **Section structure** for analysis pages:
  1. Opening paragraph: what question prompted this analysis
  2. `## Findings` — the synthesis
  3. `## Method` — how the analysis was conducted, which wiki pages were consulted
  4. `## Limitations` — what this analysis doesn't cover
  5. `## Connections` — wikilinks to related pages

---

## 3. Operations

### 3.1 Ingest — Single File

**Trigger:** User says "ingest {filename}", "process this file", or names a specific source.

**Workflow:**

1. **Read** the raw source completely. If it is a PDF, ask the user if they have a markdown conversion or offer to work from the text content.
2. **Discuss** key takeaways with the user before writing anything. Ask: "Here are the main points I see — what should I emphasize? Anything I'm missing?"
3. **Create** a source summary page at `wiki/sources/{Title}.md` — where `{Title}` is the human-readable source title (with spaces, not slugified). The filename must match the `title` frontmatter field exactly. Follow the source template structure.
4. **Create or update** entity pages in `wiki/entities/` for any people, institutions, models, or systems mentioned. If the page exists, add new information and update `updated` and `sources` fields. If it doesn't exist, create a stub.
5. **Create or update** concept pages in `wiki/concepts/` for key ideas, methodologies, or principles.
6. **Update** `wiki/manifest.md` — mark this file as `processed` (see §4).
7. **Update** `wiki/index.md` — add entries for any new pages, update descriptions for modified pages.
8. **Append** to `wiki/log.md` using the log format (see §5).
9. **Report** a summary of changes: which pages were created, which were updated, and any contradictions or open questions discovered.

**Important:** When updating existing pages, *integrate* the new information — don't just append a new section. Revise the existing text so the page reads as a coherent whole that reflects all sources.

### 3.2 Ingest — Folder (Batch)

**Trigger:** User says "process raw/{folder}", "ingest the {topic} folder", or "process all files in {folder}".

**Three modes — ask the user which they want, or infer from context:**

#### Mode A: "Process all"

Process every file in the folder, regardless of processing state. Use when reprocessing a folder from scratch or when the schema/conventions have changed significantly.

1. **Scan** the folder. List all source files (exclude `assets/` subdirectories).
2. **Check** `wiki/manifest.md` for current processing state.
3. **Present** the file list to the user with status: `{filename} — processed | unprocessed`. Confirm they want to reprocess everything.
4. **Process sequentially**, one file at a time. For each file, follow the single-file ingest workflow (§3.1) but skip the discuss step unless the user asks to stay involved. Instead, provide a brief summary after each file.
5. After all files are done, **report** a batch summary: total files processed, pages created, pages updated, contradictions found.

#### Mode B: "Process unprocessed only"

Process only files not yet marked as `processed` in the manifest. This is the default for incremental work — the user has added new sources to an existing folder.

1. **Scan** the folder and **diff** against `wiki/manifest.md`.
2. **Present** only the unprocessed files. Confirm with the user.
3. **Process sequentially**. For each new file, follow the single-file ingest workflow (§3.1).
4. **Cross-reference** each new file's content against the *already-processed* files' wiki pages. This is the key value: new sources should be woven into existing knowledge, not siloed.
5. **Report** batch summary.

#### Mode C: "Connect unprocessed to processed"

A lighter-weight operation. Don't create full source summaries for the new files — just read them and update *existing* wiki pages with any new information, cross-references, or contradictions. Useful when the new files are supplementary (e.g., a blog post that adds color to an already-ingested research paper, or a podcast transcript that reinforces points from a book chapter).

1. **Scan** for unprocessed files.
2. **Read** each unprocessed file.
3. **Read** the wiki pages that were generated from the already-processed files in the same folder (find these via `wiki/manifest.md` → `wiki_pages` field).
4. **Update** existing wiki pages with new information, links, or contradiction callouts. Do not create new source summary pages.
5. **Mark** the files as `processed` in the manifest with a note: `mode: connect-only`.
6. **Report** which existing pages were updated and how.

### 3.3 Folder Discovery

**Trigger:** User says "what folders do I have?", "show me raw status", or "what needs processing?"

**Workflow:**

1. **Recursively list** all directories under `raw/` (excluding `assets/` at any level).
2. **Cross-reference** with `wiki/manifest.md`.
3. **Present** a table showing every folder that contains source files, with nesting reflected in the path:

```
| Folder                     | Total files | Processed | Unprocessed | Last ingested  |
|----------------------------|-------------|-----------|-------------|----------------|
| raw/articles/              | 3           | 2         | 1           | 2026-04-02     |
| raw/books/ddia/            | 3           | 1         | 2           | 2026-04-03     |
| raw/trip-planning/japan/   | 2           | 0         | 2           | —              |
```

4. **Flag new folders** that have no manifest section yet — these need to be added to the manifest.

### 3.4 Query

**Trigger:** User asks a question about the wiki's domain.

**Workflow:**

1. **Read** `wiki/index.md` to identify relevant pages.
2. **Read** the relevant wiki pages (not the raw sources — the wiki is the compiled knowledge layer).
3. **Synthesize** an answer with wikilinks as citations.
4. **Offer to file** the answer: "This analysis might be worth keeping. Want me to save it as `wiki/analyses/{Descriptive Title}.md`?"
5. If the user agrees, create the analysis page, update `wiki/index.md`, and append to `wiki/log.md`.

**If the wiki doesn't have enough information:** Say so explicitly. Suggest which raw sources to look for, or offer to do a web search. Never hallucinate information that isn't in the wiki or raw sources.

### 3.5 Lint

**Trigger:** User says "lint", "health check", "review the wiki", or periodically on your own suggestion.

**Checklist:**

- [ ] **Orphan pages** — wiki pages with no inbound wikilinks from other wiki pages
- [ ] **Dead links** — wikilinks pointing to pages that don't exist (create stubs or fix)
- [ ] **Stale pages** — pages whose `sources` have been superseded by newer sources
- [ ] **Contradictions** — pages that make claims conflicting with other pages
- [ ] **Missing pages** — concepts or entities frequently mentioned but lacking their own page
- [ ] **Frontmatter gaps** — pages missing required fields
- [ ] **Confidence drift** — pages marked `high` confidence that depend on sources marked `contested`
- [ ] **Tag consistency** — tags that should exist but don't, or duplicate tags with different names
- [ ] **Manifest drift** — files in `raw/` that aren't tracked in the manifest at all
- [ ] **Cross-folder gaps** — concepts that appear in multiple folders but whose wiki pages only cite sources from one

**Output:** Write findings to `wiki/log.md` as a lint entry. For actionable items, propose fixes and wait for user approval.

### 3.6 Refactor

**Trigger:** User says "refactor", "reorganize", or the wiki has grown enough that structure needs rethinking.

This means splitting oversized pages, merging overlapping pages, promoting recurring themes to their own concept pages, or restructuring the tag hierarchy. Always discuss the plan with the user before executing.

---

## 4. Manifest Format (`wiki/manifest.md`)

The manifest is a Copilot-maintained file that tracks the processing state of every file in `raw/`. It is the single source of truth for what has and hasn't been ingested. Obsidian renders it as a readable table; Copilot parses it to determine what work needs doing.

```markdown
---
title: "Processing Manifest"
type: manifest
updated: 2026-04-07
---

# Processing Manifest

> Auto-maintained by Copilot. Do not edit manually.
> Last updated: 2026-04-07

## raw/articles

| File | Status | Mode | Ingested | Wiki Pages |
|------|--------|------|----------|------------|
| `llm-scaling-laws.md` | processed | full | 2026-04-01 | [[Scaling Laws Summary]], [[Scaling Laws]], [[Chinchilla]] |
| `attention-is-all-you-need.md` | processed | full | 2026-04-02 | [[Attention Paper Summary]], [[Transformer Architecture]], [[Self-Attention]] |
| `new-clip-article.md` | unprocessed | — | — | — |

## raw/books/ddia

| File | Status | Mode | Ingested | Wiki Pages |
|------|--------|------|----------|------------|
| `ch01-reliable-scalable.md` | processed | full | 2026-04-03 | [[DDIA Ch01 Summary]], [[Reliability]], [[Scalability]] |
| `ch02-data-models.md` | unprocessed | — | — | — |
| `ch03-storage-retrieval.md` | unprocessed | — | — | — |

## raw/trip-planning/japan

| File | Status | Mode | Ingested | Wiki Pages |
|------|--------|------|----------|------------|
| `tokyo-food-guide.md` | unprocessed | — | — | — |
| `kyoto-temples.md` | unprocessed | — | — | — |
```

Note how nested folders like `raw/books/ddia` and `raw/trip-planning/japan` use their full path as the section heading.

### Manifest field definitions

| Field | Values | Notes |
|-------|--------|-------|
| `File` | filename | Relative to the folder heading |
| `Status` | `processed` / `unprocessed` | Whether this file has been ingested into the wiki |
| `Mode` | `full` / `connect-only` / `—` | `full` = source summary + entity/concept pages created. `connect-only` = existing pages updated, no new source summary (see §3.2 Mode C). `—` = not yet processed |
| `Ingested` | ISO date / `—` | Date of last processing |
| `Wiki Pages` | wikilinks / `—` | Pages created or substantially updated from this source |

### Manifest rules

- **One section per `raw/` folder.** Section heading = folder path.
- **Update on every ingest.** After processing a file, update its row immediately.
- **New files detected during folder scan** get added as `unprocessed` rows.
- **Deleted raw files** (user removed a source): mark the row with `Status: removed` but do not delete it — the wiki pages it generated still exist and may still be valid.
- **Reprocessing** (Mode A): update the `Ingested` date and `Wiki Pages` list. Don't duplicate rows.
- The manifest is Dataview-queryable because it lives in `wiki/`. Users can query processing status across all folders.

---

## 5. Index Format (`wiki/index.md`)

```markdown
---
title: "Wiki Index"
type: index
updated: 2026-04-07
---

# Wiki Index

> Auto-maintained by Copilot. Last updated: 2026-04-07.
> Total pages: {count} | Sources ingested: {count}

## Entities

| Page | Type | Status | Summary |
|------|------|--------|---------|
| [[Entity Name]] | entity | mature | One-line description |

## Concepts

| Page | Type | Status | Summary |
|------|------|--------|---------|
| [[Concept Name]] | concept | draft | One-line description |

## Sources

| Page | Source Date | Ingested | Summary |
|------|-----------|----------|---------|
| [[Source Title]] | 2024-01-15 | 2026-04-07 | One-line description |

## Analyses

| Page | Created | Question |
|------|---------|----------|
| [[Analysis Title]] | 2026-04-07 | The question that prompted this |
```

**Update the index on every ingest, every filed query, and every lint pass.**

---

## 6. Log Format (`wiki/log.md`)

```markdown
---
title: "Wiki Log"
type: log
---

# Wiki Log

## [2026-04-07] ingest | Scaling Laws Article
- Source: `raw/articles/llm-scaling-laws.md`
- Pages created: [[Scaling Laws Summary]], [[Scaling Laws]] (concept), [[Chinchilla]] (entity)
- Pages updated: [[Transformer Architecture]] (added scaling context)
- Contradictions found: none
- Open questions: Do scaling laws hold for mixture-of-experts models?

## [2026-04-07] query | "How does self-attention differ from cross-attention?"
- Pages consulted: [[Self-Attention]], [[Transformer Architecture]], [[Attention Paper Summary]]
- Result filed as: [[Self-Attention vs Cross-Attention]]

## [2026-04-07] batch-ingest | raw/books/ddia (Mode B: unprocessed only)
- Files processed: 2 of 3 (1 already processed)
- New files: `ch02-data-models.md`, `ch03-storage-retrieval.md`
- Pages created: [[DDIA Ch02 Summary]], [[DDIA Ch03 Summary]], [[Document Model]] (stub), [[LSM Tree]] (stub)
- Pages updated: [[Scalability]] (added storage engine context from ch03)
- Contradictions found: none

## [2026-04-07] batch-ingest | raw/trip-planning/japan (Mode C: connect-only)
- Files connected: 2
- No new source summaries created
- Pages updated: [[Tokyo]] (added food guide data points), [[Kyoto]] (added temple itinerary)

## [2026-04-07] lint | Periodic health check
- Orphan pages found: [[Orphan Page]]
- Dead links fixed: 3
- Stubs promoted to draft: [[Page Name]]
- Contradictions flagged: see [[Page A]] vs [[Page B]]
```

**Prefix format:** `## [{date}] {operation} | {title}`

This format is grep-parseable: `grep "^## \[" wiki/log.md | tail -10`

---

## 7. Tag Taxonomy

Tags use a hierarchical `prefix/value` format. The taxonomy starts with a small set of structural prefixes and **grows organically** as topics are added. Copilot should propose new tags when existing ones don't fit, and periodically suggest consolidation during lint passes.

### Structural prefixes (always available)

```
topic/           → subject area (mirrors raw/ folder themes)
  topic/machine-learning
  topic/cooking
  topic/history
  topic/...               # grows with the wiki

type/            → source type
  type/article
  type/paper
  type/book
  type/transcript
  type/report

person/          → notable people referenced across sources
  person/author-name

org/             → organizations, companies, institutions
  org/company-name

meta/            → about the wiki itself
  meta/workflow
  meta/schema
  meta/tooling
```

### How to extend

- **When a new topic folder appears in `raw/`**, create a corresponding `topic/` tag. The tag name doesn't have to match the folder name exactly — use the clearest label.
- **Domain-specific prefixes** emerge naturally. If you're building a cooking wiki, you might add `cuisine/`, `technique/`, `ingredient/`. If it's a research wiki, maybe `method/`, `theory/`, `dataset/`. Copilot should suggest new prefixes when a single prefix accumulates too many unrelated tags.
- **Avoid tag proliferation.** Before creating a new tag, check if an existing one covers the same ground. During lint passes, flag near-duplicate tags (e.g., `topic/ml` vs `topic/machine-learning`).
- **Tags are lowercase, hyphen-separated.** No spaces, no camelCase.

---

## 8. Cross-Referencing Rules

1. **Every entity and concept page must link to at least 2 other wiki pages.** If a page can't link to anything, it's either misclassified or the wiki has a gap.
2. **Prefer specific links over general ones.** Link to `[[Transformer Architecture]]` not `[[Machine Learning]]`.
3. **Use the `aliases` frontmatter field** so that Obsidian auto-suggests links. For example, a page titled "Generative Adversarial Network" should have aliases `GAN`, `GANs`.
4. **Bidirectional awareness:** When you create a link from page A → B, check whether page B should also reference A. Obsidian shows backlinks, but explicit forward links are better for readability.
5. **`[[raw/...]]` links are source citations.** They always point from wiki pages into the raw layer. Never link from raw to wiki.

---

## 9. Confidence & Contradiction Handling

### Confidence levels

| Level | Meaning | When to use |
|-------|---------|-------------|
| `high` | Well-established, multiple concordant sources | Textbook facts, widely accepted frameworks, official documentation |
| `medium` | Supported but with caveats or limited sources | Single authoritative source, or consensus with known exceptions |
| `low` | Preliminary, single source, or author's interpretation | Blog posts, early-stage ideas, informal commentary |
| `contested` | Sources actively disagree | Ongoing debates, conflicting data, evolving consensus |

### When sources contradict

1. **Do not silently overwrite.** If a new source contradicts an existing wiki page, flag it.
2. **Add a `> [!warning] Contradiction` callout** in the affected page(s):
   ```markdown
   > [!warning] Contradiction
   > [[Source A]] states X, but [[Source B]] claims Y. See [[log.md#2026-04-07]] for context.
   ```
3. **Set `confidence: contested`** on the affected page.
4. **Log it** in `wiki/log.md`.
5. **Ask the user** how to resolve it, or leave it as an open question.

---

## 10. Copilot-Specific Guidance

### Context management

- **Always read `wiki/index.md` first** when answering questions or starting an ingest. This is your map of the wiki.
- **Read `wiki/manifest.md`** before any ingest or folder operation. This is your map of processing state.
- **Read `wiki/log.md` tail** (`grep "^## \[" wiki/log.md | tail -5`) to understand recent activity.
- If the wiki grows beyond ~100 pages, the index alone may not be sufficient for finding relevant pages. At that point, suggest adding a search tool (e.g., `qmd` or a custom grep-based script).

### Multi-file edits

- When ingesting a source, you will typically touch 5-15 files in one pass. Use VS Code's agent mode to propose all edits, then let the user review the diff.
- **Group related changes** in your explanation: "I'm creating 2 new pages and updating 4 existing ones. Here's what changes and why."

### What NOT to do

- **Don't paraphrase when precision matters.** For technical definitions, specifications, or primary sources, preserve exact wording in quotes and cite the specific section or page.
- **Don't create pages speculatively.** Every page must be grounded in at least one raw source or an explicit user request.
- **Don't reorganize the raw layer.** Ever.
- **Don't use HTML in markdown.** Obsidian renders standard markdown and its own extensions (callouts, wikilinks, Dataview). Stick to those.
- **Don't modify frontmatter of pages you're not substantively editing.** Avoid unnecessary `updated` date churn.

### When to suggest vs. act

- **Act** when the operation is routine: updating index, appending to log, updating `updated` dates.
- **Suggest and wait** when the operation involves judgment: resolving contradictions, merging pages, promoting stubs, restructuring tags.
- **Always discuss before deleting** any wiki page, even a stub.

---

## 11. Obsidian Plugin Expectations

The user's Obsidian vault is expected to have these plugins. You can reference their features in your pages:

| Plugin | How it's used |
|--------|--------------|
| **Dataview** | Dynamic tables/lists from frontmatter. Use YAML fields that Dataview can query. |
| **Templater** | Page templates in `templates/`. Not your concern — the user triggers these. |
| **Graph View** | (Core plugin) Visualizes wiki link structure. Your cross-referencing quality directly affects its usefulness. |
| **Backlinks** | (Core plugin) Shows inbound links. Make forward links explicit anyway. |
| **Web Clipper** | Browser extension → `raw/articles/`. Quick source capture for web content. |
| **Marp** | (Optional) Slide decks from markdown. Analysis pages can be formatted for Marp export. |

### Dataview query examples the user might run

```dataview
TABLE status, confidence, updated
FROM "wiki/concepts"
WHERE contains(tags, "topic/machine-learning")
SORT updated DESC
```

```dataview
LIST
FROM "wiki"
WHERE status = "stub"
```

```dataview
TABLE sources, confidence
FROM "wiki/sources"
WHERE contains(sources, "raw/books/ddia")
SORT updated DESC
```

The manifest (`wiki/manifest.md`) is also browsable in Obsidian as a rendered markdown table. For quick processing status across all folders, the user can simply open the manifest.

Ensure your frontmatter is always Dataview-compatible: valid YAML, consistent field names, no typos in enum values.

---

## 12. Getting Started — Bootstrap Sequence

When the wiki is new and empty, follow this sequence:

1. **Scan** `raw/` and **create** `wiki/manifest.md` with all folders and files listed as `unprocessed`.
2. **Create** `wiki/index.md` and `wiki/log.md` with empty scaffolding.
3. **Pick one folder** to start with. Ingest the first 3-5 sources one at a time (Mode B), staying closely involved with the user.
4. After 5 sources, **run a lint pass** to check cross-referencing quality and tag consistency.
5. **Review the schema** (this file) with the user and adjust conventions based on what worked.
6. **Move to the next folder.** As cross-folder concepts emerge, the wiki starts compounding across topics.
7. Continue ingesting, querying, and filing. The wiki compounds from here.

---

*This schema is a living document. Revise it as the wiki evolves and you discover what works for your topics.*
