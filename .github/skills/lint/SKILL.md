---
name: lint
description: "Health-check the wiki — find orphans, dead links, contradictions, stale pages, and suggest improvements"
disable-model-invocation: true
---
# Lint Wiki

You are a wiki maintainer operating under the conventions in [copilot-instructions.md](../../copilot-instructions.md).

Perform a comprehensive health check of the wiki. Read through the wiki pages systematically and report findings.

## Steps

1. **Read `wiki/index.md`** to get the full list of wiki pages.

2. **Read `wiki/manifest.md`** to understand processing state.

3. **Read `wiki/log.md` tail** (last 10 entries) to understand recent activity.

4. **Check each category below.** For each issue found, note the specific page and what needs fixing.

## Checklist

### Structure
- **Orphan pages** — wiki pages that have no inbound `[[wikilinks]]` from other wiki pages. Every page should be reachable.
- **Dead links** — `[[wikilinks]]` that point to pages that don't exist. Either create a stub or fix the link.
- **Missing pages** — concepts or entities that are mentioned frequently in other pages but don't have their own page yet. Suggest which ones deserve a page.

### Content quality
- **Stale pages** — pages whose `sources` have been superseded by newer sources that aren't yet reflected.
- **Contradictions** — pages that make claims conflicting with other pages. Check for existing `> [!warning] Contradiction` callouts and look for unflagged conflicts.
- **Confidence drift** — pages marked `confidence: high` that depend on sources marked `confidence: contested` or `low`.
- **Stubs that should be promoted** — pages with `status: stub` that now have enough information from other pages to be upgraded to `draft` or `mature`.

### Frontmatter hygiene
- **Filename-title mismatches** — the filename (without `.md`) must exactly match the `title` frontmatter field. If a file is `scaling-laws.md` but the title is "Scaling Laws", the wikilinks are broken. **This is the highest-priority fix.**
- **Language consistency** — pages sourced from Chinese documents must be entirely in Simplified Chinese (body, title, headings). Flag any pages that mix Traditional and Simplified Chinese, or that have Chinese content with an English title (or vice versa). Tags and frontmatter enum values should always be in English.
- **Missing required fields** — pages lacking any of: `title`, `type`, `tags`, `created`, `updated`, `sources`, `confidence`, `status`.
- **Inconsistent enum values** — typos in `type`, `confidence`, or `status` fields (e.g., `hight` instead of `high`).
- **Stale `updated` dates** — pages whose content has been modified but whose `updated` date wasn't bumped.

### Tag consistency
- **Near-duplicate tags** — tags that cover the same ground with different names (e.g., `topic/ml` vs `topic/machine-learning`).
- **Orphan tags** — tags used by only one page (might be fine, but worth flagging).
- **Missing tags** — pages that should have a tag based on their content but don't.

### Manifest integrity
- **Untracked files** — files in `raw/` that have no row in `wiki/manifest.md` at all.
- **Removed sources** — files listed in the manifest that no longer exist in `raw/`.
- **Cross-folder gaps** — concepts that appear in sources from multiple folders but whose wiki pages only cite one folder's sources.

## Output

1. **Write findings to `wiki/log.md`** as a lint entry:
   ```
   ## [YYYY-MM-DD] lint | Health check
   - Orphan pages: {list or "none"}
   - Dead links: {count} found, {list}
   - Contradictions flagged: {list or "none"}
   - Stubs ready to promote: {list or "none"}
   - Frontmatter issues: {count}
   - Tag issues: {list or "none"}
   - Manifest drift: {list or "none"}
   - Suggested new pages: {list or "none"}
   - Suggested new sources to find: {list or "none"}
   ```

2. **Present a summary to the user** organized by severity:
   - **Fix now** — dead links, frontmatter gaps, untracked files
   - **Review** — contradictions, confidence drift, stale pages
   - **Opportunities** — missing pages, stubs to promote, cross-folder gaps, new sources to look for

3. **For each "Fix now" item, propose a specific fix** and wait for user approval before applying.

## Important

- Do NOT auto-fix contradictions or merge pages. These require judgment — present the issue and let the user decide.
- Do suggest new questions to investigate and new sources to look for. The LLM is good at spotting gaps.
- If the wiki is small (<20 pages), a full read-through is fine. If larger, focus on the most recently modified pages and their connections.
