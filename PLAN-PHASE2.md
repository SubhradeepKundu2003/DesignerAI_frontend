# Implementation Plan — Phase 2: Multi-Page, Asset Library, AI Placement

**Project:** DesignerAI — AI-Powered Newsletter Design Platform
**Builds on:** [PLAN.md](PLAN.md) (Phase 1, milestones M1–M7, all complete)
**Phase 2 covers three asks:**
1. Page-by-page editing — add/remove/reorder pages, not just page 1
2. An infographics/asset library sourced from `C:\Users\kundu\Downloads\Infographics`
3. AI-assisted placement of text and design onto the canvas

**AI backend decision (confirmed with user 2026-08-03):** local **Ollama** on Windows, not the
originally-planned Mac MLX model. This is a real trade-off vs. a cloud API — weaker structured-output
reliability, so Track C is designed around a validate/repair loop rather than trusting raw model output.

---

## 0. What's already true (don't rebuild)

- `CanvasDocument.pages: Page[]` **already exists** in the data model
  (`canvas-document.model.ts`) — multi-page was designed for from day one. Phase 1 deliberately
  scoped the *UI* to page 1 only ("Out of Scope: multi-page UI"). Track A is a state/UI gap, not a
  data-model change.
- The command-bus/undo system, element renderer registry, and `LoadCanvasCommand` path are exactly
  the seams Track C plugs into — per PLAN.md §13, this was designed in from the start.
- `ImageUploadService` + `ElementFactory.createImage` already do "file → dataURL → scaled `ImageElement`
  centred in the safe area" — Track B's fast path is this same pipeline fed from a curated manifest
  instead of a file picker.
- I inspected one of the 23 source PNGs: they are **flattened 16:9 slide exports** (title + numbered
  callouts + icons + client logos already baked into pixels), not layered/vector source. That shapes
  Track B below — see §2.

---

## Track A — Multi-page editing

**Goal:** add, delete, duplicate, reorder, and navigate between pages; each page independently editable.

### State changes
- `CanvasStore`: add `activePageIndex` signal; `activePage` becomes `computed(() => document().pages[activePageIndex()])` instead of hardcoded `pages[0]`.
- `activePageIndex` is ordinary UI state, **not** part of the undoable `CanvasDocument` — switching pages shouldn't be a history entry, only editing one should be.
- Add optional `name` to `Page` (mirrors `CanvasElement.name`) so pages are addressable — "Cover", "Page 2" — both in the UI and later by the AI ("put this on the Events page").

### New commands (same `Command` interface, same undo stack)
- `AddPageCommand` — blank page or duplicate-current, inserted at a given index
- `DeletePageCommand` — refuses to leave zero pages; if it deletes the active page, adjacent page becomes active
- `DuplicatePageCommand` — deep-copies elements with fresh ids (reuse `ElementFactory`'s id logic)
- `ReorderPageCommand` — array move, mirrors `MoveElementCommand`'s pattern from the layers panel

### New UI
- **Page navigator** — a thumbnail filmstrip (recommend: horizontal strip under the canvas, or a slim vertical rail left of the sidebar). Click = switch page, "+" = add page, drag = reorder, right-click/hover actions = duplicate/delete/rename.
- Thumbnails need a cheap page→image snapshot. Two options:
  - Render each page's elements at small scale with a lightweight non-Konva 2D-canvas draw (fast, no second Konva stage)
  - Or reuse Konva: `stage.toDataURL()` from an offscreen stage per page, debounced like autosave
  - Recommend the offscreen-Konva route since it reuses the existing renderer registry exactly (no second rendering code path to maintain).
- Toolbar gains a page indicator ("Page 2 of 5") next to existing controls.

### Milestones
| # | Deliverable |
|---|---|
| A1 | `activePageIndex` + computed `activePage`; Add/Delete/Duplicate/Reorder page commands; app still only shows page 1 in UI but data model is multi-page end-to-end (verified via unit tests) |
| A2 | Page navigator component: list, click-to-switch, add/duplicate/delete/rename, no thumbnails yet (placeholder swatch) |
| A3 | Real thumbnails via offscreen-stage snapshot service, debounced refresh on document change |
| A4 | Polish: keyboard page-switch (e.g. `Ctrl+Alt+↑/↓`), drag-to-reorder in the navigator, empty-state/last-page guard |

---

## Track B — Infographics / asset library

**Source:** 23 PNGs in `C:\Users\kundu\Downloads\Infographics`, confirmed to be flattened 16:9 slide
exports (icons + placeholder copy already rendered into pixels). This matters: dropped onto the canvas
as-is, they're **static pictures** — resizable/movable like any `ImageElement`, but the text baked
inside them (e.g. "This is a sample text") is not separately editable, and the AI can't rewrite it.

Two tiers, ship Tier 1 first:

### Tier 1 — Image library (fast, do this first)
- Copy the curated set into the app under `public/assets/infographics/` (build-time static assets — no backend storage needed since there is no backend yet).
- Write a manifest (`infographics.manifest.ts`): `{ id, file, label, tags[], width, height }` — hand-tagged once, not derived by any image analysis (23 images doesn't need ML search).
- New sidebar tab **"Assets"** next to Insert/Layers: thumbnail grid, click or drag onto the canvas → same "scale to fit safe area, centre, cascade" placement `ElementFactory`/`ImageUploadService` already do for uploads.
- This alone answers "no infographics available" — ships without touching Track C at all.

### Tier 2 — Editable templates (higher effort, optional, do later)
For the small number of layouts worth reusing across many newsletters (e.g. the 4-point radial one I
opened, a stat-comparison layout, a timeline), hand-rebuild them as **native Canvas JSON element
bundles** — a background `ShapeElement`, small icon `ImageElement`s, and real `TextElement`s — instead
of one flattened picture. That's what makes them AI-fillable later (Track C can rewrite the text nodes;
it can never rewrite pixels inside a PNG).
- Needs one small model/command addition: an `InsertTemplateCommand` that adds a named bundle of
  elements as **one** undo step (same pattern `DeleteElementCommand`/`DuplicateElementCommand` already
  use for multi-element batches — no new "group" element type required).
- Pick ~5–8 templates worth the manual rebuild effort; the rest stay Tier 1 static images.
- List these under a separate "Templates" section of the Assets panel, distinct from "Images."

### Milestones
| # | Deliverable |
|---|---|
| B1 | Curate + copy PNGs into `public/assets/infographics/`, write the tagged manifest |
| B2 | Assets panel UI: grid, search/filter by tag, click/drag-to-place |
| B3 | *(optional, later)* `InsertTemplateCommand` + 5–8 hand-rebuilt editable templates |

---

## Track C — AI-assisted placement

**Depends on A and B** — the AI's actual job is "add a page, put text and an infographic on it," which
only makes sense once pages and assets exist to place things on/with.

### Architecture

```
User prompt (+ optional source text/brief)
        │
        ▼
Angular (new "Generate" panel) ──HTTP──▶ New backend (FastAPI, doesn't exist yet)
                                              │
                                              ▼
                                   Ollama (localhost:11434)
                                   model: pick largest that fits
                                   available VRAM (qwen2.5-instruct
                                   class recommended for JSON-following)
                                              │
                                              ▼
                                Schema-constrained structured output
                                (Ollama `format` / grammar, mirroring
                                 CanvasElement/Page as JSON Schema)
                                              │
                                              ▼
                         Backend: validate → repair-retry (≤3) →
                         clamp ids/bounds/z-order → never trust
                         model numbers blindly
                                              │
                                              ▼
                    Frontend: map to AddPageCommand + element-insert
                    commands, batched as ONE undo step
                                              │
                                              ▼
                         CanvasStore → Reconciler → Konva
```

### Key decisions this track has to make
1. **New backend required** — nothing exists today beyond the Angular app. FastAPI (already the
   README's original assumption) talking to Ollama's HTTP API.
2. **Reliability is the named risk of the Ollama choice.** Mitigate, don't ignore:
   - Constrain generation to a JSON Schema mirrored from `CanvasElement`/`Page` (single hand-maintained
     schema file the backend owns; drift-check against the TS types in CI later, not v1).
   - Validate → on failure, retry with the validation error fed back into the prompt, bounded retries.
   - Server-side clamp pass regardless of validity: unique ids, in-bounds x/y/w/h, referenced asset ids
     actually exist in the Track B manifest. The model's numbers are a suggestion, never authoritative.
3. **AI acts through commands, never a whole-document overwrite.** A prompt like "add a 4-step process
   page using an infographic" should produce `AddPageCommand` + a handful of `AddElementCommand`s (or
   `InsertTemplateCommand` if it picked a Tier 2 template) — batched as one undo step, so a bad
   generation is one Ctrl+Z away. This needs a small `CommandBus` addition: batch N commands into one
   history entry (same shape as the existing multi-element delete/duplicate, generalized).
4. **Asset grounding, not image generation.** The backend feeds the model the Track B manifest
   (id + tags + short description) so it *chooses* an existing asset by id rather than hallucinating
   one — keeps output cheap and guarantees every referenced image actually exists.
5. **UI:** a prompt box (new panel/drawer) — "generate then let the user undo if unhappy" is enough for
   v1 given undo already exists; no separate preview/diff UI needed initially.

### Milestones
| # | Deliverable |
|---|---|
| AI1 | Backend skeleton: FastAPI, `/health`, CORS for `localhost:4200`, config for Ollama host/model |
| AI2 | JSON Schema contract for `Page`/`CanvasElement`; `/generate` endpoint round-trips a schema-constrained Ollama call, no repair loop yet — prove the pipe works |
| AI3 | Validation + repair-retry loop + id/bounds/z-order clamping; typed error responses |
| AI4 | Frontend "Generate" panel; response → batched commands (requires the `CommandBus` batching addition) |
| AI5 | Feed the Track B manifest into the prompt so the AI can pick real assets/templates |
| AI6 | Iteration pass on real newsletter briefs; tune model size/prompt; scoped actions like "regenerate this page" |

---

## Sequencing

**A → B (Tier 1) → C (AI1–AI4, no asset-awareness yet) → B Tier 2 interleaved with AI5 → AI6 polish.**

Reasoning: A and B1/B2 are independent, low-risk, and each ships something immediately useful on its
own (you can already add pages and drop infographics in before any AI code exists). C is the largest,
riskiest chunk — new backend, new local infra, schema design, structured-output reliability — and its
early milestones (AI1–AI4) don't need Tier 2 templates to prove the pipeline. Tier 2 template rebuilding
is manual, ongoing work best done once you know which templates the AI actually reaches for.

---

## Open items before I start building

- Is Ollama already installed on this machine, and what GPU/VRAM is available? That decides which
  model size (7B/14B/32B-class) is realistic for both quality and latency.
- Curate all 23 PNGs into Tier 1, or should I pick a subset now and you prune later?
- OK to add a new sibling folder `designerai-backend/` (Python/FastAPI) alongside `designerai-frontend/`?

---

## Out of scope (still, per Phase 1 §12, unless raised again)

Auth, export, collaboration, comments, version history beyond in-session undo, image cropping, rich
text, animations/prototyping.
