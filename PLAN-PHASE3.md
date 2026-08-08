# Implementation Plan — Phase 3: Flexible Design System, AI Design Agent, Export & Project Format

**Project:** DesignerAI — AI-Powered Design Studio (newsletter canvas → general infographic/design tool)
**Builds on:** [PLAN.md](PLAN.md) (Phase 1, M1–M7, complete) and [PLAN-PHASE2.md](PLAN-PHASE2.md) (Phase 2,
Tracks A & B substantially complete — multi-page, grouping, marquee-select, 12 hand-built infographic
templates in `canvas/data/templates/`, Tier-1 asset library all shipped; Track C/AI was scoped but not started)
**Focus of this phase (per direction 2026-08-08):** mainly frontend. The AI *agent* gets a clean frontend
contract now; the model/backend it talks to is swappable and lower priority. Export and the project file
format are pure frontend work and ship independent of the agent.

---

## 0. Reframing: what actually changes

Nothing here throws away Phase 1/2 architecture — the guiding principles still hold: **Canvas JSON is
the single source of truth, every mutation is a Command, renderers are dumb, AI only ever talks through
the command bus.** Phase 3 is four additive tracks on top of that:

| Track | One-line goal | Depends on |
|---|---|---|
| **D — Flexible design system** | Richer element types + a real theme/token layer, so designs (hand-made or AI-made) stay visually consistent | nothing new — extends existing model |
| **G — Project file format** | A real `.dzn` file (own extension) to import/export a whole project, not just the one localStorage slot | Track D's model (frozen-ish shape before wrapping it in a container) |
| **F — Export pipeline** | PDF and PPTX (and PNG) output straight from the Canvas JSON | Track D (exporters must handle the final element set) |
| **E — AI design agent** | An agent that plans, builds, edits and critiques designs on the canvas through commands, and can look at a reference image and imitate its structure | Track D (theme-aware output), benefits from F/G existing |

Already true and reusable, confirmed by reading the current code, not just the old plans:
- `Page.width`/`height` are **already per-page**, not a global constant — arbitrary canvas sizes
  (16:9 slide, square social tile, A4) are already representable. Track D doesn't need a model change
  for this, just UI (size presets on "Add page") and making sure new element types respect it.
- `CompositeCommand` (`commands/composite.command.ts`) already batches N commands into one undo step —
  this is exactly the primitive Phase 2's Track C notes flagged as still-needed for AI actions. It exists.
  Track E reuses it as-is.
- `InfographicTemplate.build()` already returns real `TextElement`/`ShapeElement`/`ImageElement` bundles
  (12 templates in `data/templates/`) — but colours are **baked in** from the static `palette.ts` constants
  at build time. That's the concrete gap Track D closes: templates/AI output should reference theme
  *slots*, not literal hex, so a theme swap recolors everything that used it.
- Images are already inline data URLs in the document (`ImageElement.src`), so today's documents are
  already fully self-contained JSON — Track G's container format is about not paying that cost forever
  (bloated JSON, no per-asset dedup) more than it is about fixing a missing capability.

---

## Track D — Flexible design system

**Problem this solves:** today "flexible" is capped by four element types and colours/fonts that are
copy-pasted literals wherever a template or the AI needs them. Two designs never guaranteed to look like
they belong to the same brand, and every new infographic shape needs hand-tuned hex codes.

### D1 — Design tokens (theme layer)

New model, `canvas/models/design-theme.model.ts`:

```ts
interface DesignTheme {
  id: string;
  name: string;
  colors: {
    ink: string; muted: string; surface: string; border: string;
    accents: { name: string; solid: string; tint: string }[];  // cycled by index, like ACCENT_CYCLE today
  };
  fonts: { heading: string; body: string };
  radius: number;      // default corner radius for new shapes
  spacing: number;      // base spacing unit templates/frames align to
}
```

- Lives on `CanvasDocument.theme` (one theme per project — simplest useful scope; per-page theming is
  future work, not needed yet).
- **Elements keep literal values** (still pure, still `JSON.stringify`-safe — no functions/refs) but gain
  an *optional* `themeRef` alongside each themeable field, e.g. `ShapeElement.fill: string` stays,
  add `fillRef?: 'accent-1' | 'ink' | 'muted' | ...`. Renderer resolves: if `fillRef` set, look up the
  live theme and use that colour; the literal `fill` is just the last-resolved value (so documents still
  render correctly even with no theme, e.g. old saved projects). This is the same pattern the codebase
  already uses for backward-compat (`page.groups ?? []`) — additive, no migration required.
- `ThemeStore` (signal store, mirrors `EditorSettingsStore`): current theme + a small shipped preset list
  (start with today's indigo/teal/amber/rose as one preset, add 2–3 more palettes + font pairings).
  `ApplyThemeCommand` walks the active page's elements and re-resolves every `*Ref` field — one undo step.
- `data/templates/palette.ts` becomes the *default* theme rather than a hardcoded constant; existing
  templates are updated to set `*Ref` fields instead of raw hex so they go theme-aware for free.

### D2 — New element types (additive to the union, Open/Closed as designed)

Adding a member to `CanvasElement` touches: renderer registry, properties panel `@switch`, element
factory, and (once it exists) every exporter — the registry/factory pattern already makes this
mechanical, not risky. Priority order:

1. **`IconElement`** — `{ type: 'icon', iconId: string, fill: string, fillRef?, size: number }`. Renders
   from a small bundled SVG-symbol sprite (`shared/icons/`), not a flattened image — so, unlike today's
   template icons (baked as decorative `ImageElement` data URIs per `infographic-template.model.ts`),
   icons can be recoloured by a theme swap and picked individually by the AI from a known icon-id list.
2. **`FrameElement`** — `{ type: 'frame', layout: 'row' | 'column', gap: number, padding: number,
   childIds: string[], background?, fillRef? }`. An auto-arranging container: children lay out along one
   axis with a gap, like a minimal flexbox. This is the single biggest lever for consistency and for the
   AI: "3 stat callouts in a row" becomes one `AddElementCommand` for a frame + N children, with spacing
   computed once, instead of N hand-placed absolute boxes that drift out of alignment on edit. Distinct
   from `GroupElement` (which only tracks a derived bbox of freely-positioned members) — a frame *owns*
   its children's layout.
3. **`ConnectorElement`** *(stretch, later milestone)* — arrowed/curved line between two element ids
   (flowchart/process diagrams), upgrading what `DividerElement` (straight, no arrowheads) can't do.
4. **`ChartElement`** *(stretch, later milestone)* — bar/line/donut driven by an inline `{label, value}[]`
   and theme colours. Real "infographic" content, not just decoration — but scope carefully: a full
   charting engine is its own project, so v1 should be 2–3 chart kinds hand-rendered on Konva
   (`Konva.Shape` sceneFuncs), not a charting library dependency.

Recommend shipping IconElement + FrameElement in this phase; Connector/Chart are flagged for Phase 4
unless a specific infographic brief needs them sooner.

### D3 — Block library maturity

Promote the existing 12 `InfographicTemplate`s from "flattened palette + absolute positions" to
"theme-ref'd + built from Frames/Icons where the layout is a repeating row/column" (e.g. `stat-row`,
`card-grid`, `comparison-columns` are exactly frame-shaped). This is incremental — do it template by
template, verified visually each time — and it's what makes those templates safe for the AI to fill in:
an agent that changes a stat's number can trust the frame to keep everything aligned.

### Milestones

| # | Deliverable |
|---|---|
| D1 | `DesignTheme` model, `ThemeStore`, `ApplyThemeCommand`, 3–4 shipped presets, theme picker in toolbar |
| D2 | `IconElement` + icon sprite set + properties panel + renderer; `FrameElement` + auto-layout renderer + properties panel |
| D3 | Rewrite `palette.ts`-derived templates to theme-refs; rebuild 3–4 of the 12 templates (the row/grid-shaped ones) on Frames |
| D4 *(stretch)* | `ConnectorElement`, `ChartElement` (2–3 chart kinds) |

---

## Track G — Native project file format

**Goal:** a `.dzn` file (name placeholder — bikeshed later) that round-trips an entire project: document,
theme, and assets, shareable/backup-able outside `localStorage`, and the thing Track F's exporters read
from and Track E's agent output gets saved into once accepted.

### Format

A ZIP container (same family as `.pptx`/`.sketch`/`.figma` exports) built client-side with **JSZip** — no
backend required, matches "mainly frontend":

```
project.dzn  (zip)
├── manifest.json     { formatVersion, appVersion, createdAt, modifiedAt, title }
├── document.json     the CanvasDocument (version 1, unchanged shape)
├── theme.json         DesignTheme, if set
├── thumbnail.png       first-page snapshot (reuses the offscreen-Konva snapshot service Phase 2's
                          Track A already planned for page-navigator thumbnails — one snapshot path,
                          two consumers)
└── assets/
      ├── img-<hash>.png ...
```

- **Externalize large images:** on export, any `ImageElement.src` data URL over a size threshold
  (e.g. 50 KB) gets hashed, written to `assets/`, and replaced with `asset:img-<hash>.png` in
  `document.json`; small images stay inline. On import, `asset:` refs are rehydrated back to blob URLs
  for the editing session. Below the threshold, don't bother — simplicity over marginal savings.
- `manifest.json.formatVersion` is independent of `CanvasDocument.version` — the container can gain
  fields (e.g. multiple themes, fonts folder) without touching the document schema.
- `ProjectFileService` (new, `core/services/` or `canvas/services/`): `exportProject()` → builds the zip,
  triggers a browser download; `importProject(file)` → unzips, validates `manifest.json`, rehydrates
  assets, dispatches the existing `LoadCanvasCommand` (undoable, same seam Phase 1 already built for
  localStorage load).
- Toolbar gains **Export Project (.dzn)** / **Import Project** actions, next to (not replacing) the
  existing Save/Load-to-localStorage, which stays as the autosave/quick-resume path.

### Milestones

| # | Deliverable |
|---|---|
| G1 | `manifest.json` + `document.json` zip round-trip via JSZip, no asset externalization yet, toolbar Export/Import |
| G2 | Asset externalization (hash, size threshold, rehydration on import) + thumbnail snapshot in the manifest |
| G3 | Format-version migration hook (mirrors `CANVAS_DOCUMENT_VERSION` pattern) so a v1 `.dzn` still opens after the format grows |

---

## Track F — Export pipeline (PDF, PPTX, PNG)

**Key fork, decided here rather than left open:** PDF and PPTX need genuinely different strategies
because of what each format actually *is*.

- **PDF → raster-first.** A PDF built by re-drawing vector text/shapes in a PDF library's own API
  (pdf-lib) would require a second implementation of every renderer (`text.renderer.ts`,
  `shape.renderer.ts`, ... all over again against a different drawing API) and would drift from what the
  canvas actually shows. Instead: reuse the offscreen-Konva-stage snapshot approach already planned for
  page thumbnails, render each page to a high-res PNG (2–3x page pixel size for print-quality), and
  assemble pages into a PDF with **jsPDF** (`addImage` per page). Pixel-perfect match to the canvas,
  reuses one rendering path, ships fast. Cost: text isn't selectable/searchable in the output PDF — flag
  this as a known limitation, not a silent gap. Selectable-text PDF export is a valid later upgrade if it
  turns out to matter, but it's a second rendering pipeline and shouldn't gate v1.
- **PPTX → native shapes, not raster.** Here the tradeoff flips: **pptxgenjs** exposes an API
  (`addText`, `addShape`, `addImage`, `addTable`) that maps almost 1:1 onto `CanvasElement` variants, so
  building real editable PowerPoint shapes is *less* work than rasterizing, and gives a materially better
  result (recipient can actually edit the deck). Mapping:
  - `TextElement` → `slide.addText(text, {x,y,w,h,fontFace,fontSize,color,align,...})`
  - `ShapeElement` → `slide.addShape('rect'|'ellipse', {...fill, line})`
  - `DividerElement` → `addShape('line', ...)`
  - `ImageElement` → `addImage({data: dataUrl, x,y,w,h})`
  - `FrameElement` (once D2 ships) → no pptx primitive; flatten to its resolved children's absolute
    positions (frame itself doesn't need to exist in the output, just its layout effect already baked
    into child x/y before export)
  - `GroupElement` → pptxgenjs doesn't group on insert either; export members at their resolved
    positions (still visually identical, just not re-groupable in PowerPoint — acceptable v1 gap)
  - `IconElement` → render to a small inline SVG/PNG at export time (pptxgenjs has no vector-icon
    primitive) via the same sprite used on canvas
- **PNG** (single page or all pages zipped) — nearly free once the PDF path's per-page snapshot exists;
  ship it alongside PDF in the same milestone.
- `Exporter` interface, one per format, each taking `(document: CanvasDocument, theme?: DesignTheme)` —
  consistent with "Canvas JSON is the single source of truth," no shared intermediate representation
  needed beyond the document itself.
- New toolbar **Export** menu: format choice, page range (all / current / range), and for PPTX no extra
  choices needed (always native); PDF/PNG could offer a resolution multiplier later — not v1.

### Milestones

| # | Deliverable |
|---|---|
| F1 | Offscreen-stage per-page PNG snapshot service (shared with Track G's thumbnail need — build once) |
| F2 | PDF export via jsPDF from the PNG snapshots; PNG export (single + all-pages-zip) |
| F3 | PPTX export via pptxgenjs, element-type mapping above, starting with text/shape/divider/image |
| F4 | Extend PPTX mapping to Icon/Frame/Group once Track D2 ships |

---

## Track E — AI design agent

**Frontend-first framing:** build the *contract* and every frontend piece an agent needs to act safely,
so the backend/model is a swappable implementation detail behind one `AgentClient` interface — continuing
Phase 2's Ollama decision if nothing changes that, but not hard-wiring the frontend to it.

### What "understands design" means here (scoped concretely, not aspirationally)

1. **Brief → layout plan → elements**, not one-shot JSON dump. The agent first proposes a short structured
   *plan* (which pages, what each contains, which theme/template blocks it intends to use — grounded in
   the Track B manifest + Track D theme list, same "asset grounding, not hallucination" principle Phase 2
   already committed to) and only after that emits the actual element-level commands. This gives a natural
   place for the user to redirect before 40 elements land on the canvas.
2. **Reference-image understanding**, new in this phase: user can drop in a screenshot/photo of a design
   they like. A vision-capable pass converts it into a *structured layout brief* (regions, approximate
   color palette, heading/body split, roughly how many content blocks) — **not** pixel tracing or literal
   copying. The agent then designs a new page from that brief using our own element/theme/template
   vocabulary. This keeps the output copyright-clean and inside our editable-element model, rather than
   depositing an ungrounded raster.
3. **Multi-turn, document-aware edits.** Follow-ups ("make the title bigger," "swap this icon for a
   different one") are sent with the *current* active page's Canvas JSON (or a diff since last turn) as
   context, and produce a small `UpdateElementCommand`/`CompositeCommand`, not a full-page regeneration —
   reuses the exact merge/undo machinery already in place.
4. **Design linter (no AI, pure function)** — `canvas/services/design-lint.service.ts`: checks any page
   for out-of-bounds elements, text/background contrast below a threshold, overlapping text boxes, empty
   frames, text overflow (using the existing `measureTextHeight` utility from M5). Runs automatically on
   agent output *before* it's committed (reject/retry loop, mirrors Phase 2's validate-and-repair idea but
   now partly enforceable in the frontend without a round-trip) **and** is exposed as a manual "Check
   design" button for human-made pages — one implementation, two audiences.

### Architecture

```
User prompt / reference image
        │
        ▼
Generate panel (new, frontend) ──▶ AgentClient (interface; HTTP+SSE impl talks to backend)
                                          │
                                          ▼
                              Backend (FastAPI, per Phase 2 Track C — unchanged decision:
                              local Ollama; vision step for reference images needs a
                              vision-capable local model or a fallback cloud call — flag as
                              an open question, see below)
                                          │
                                          ▼
                         Schema-constrained JSON (Page/element/theme schema,
                         extended for Icon/Frame once Track D2 ships)
                                          │
                                          ▼
                  Frontend: design-lint.service validates → on failure, one
                  repair round-trip with the lint errors fed back
                                          │
                                          ▼
                  AgentActionExecutor maps plan → CompositeCommand
                  (batched, ONE undo step, reuses existing primitive)
                                          │
                                          ▼
                       CanvasStore → Reconciler → Konva
```

### Milestones

| # | Deliverable |
|---|---|
| E1 | `AgentClient` interface + `Generate` panel UI (prompt box, page/target picker) with a stubbed/mock client so the frontend is fully buildable and testable before the backend exists |
| E2 | `design-lint.service.ts` + manual "Check design" button (ships independent of AI — pure frontend value) |
| E3 | Backend skeleton (FastAPI + Ollama) per Phase 2 Track C AI1–AI3, now targeting the Track D theme/Icon/Frame schema; wire real `AgentClient` impl behind E1's interface |
| E4 | Plan-then-build two-step flow; `AgentActionExecutor` → `CompositeCommand`; lint-validate-repair loop |
| E5 | Reference-image → structured layout brief → generated page (needs a vision-capable model decision, see open questions) |
| E6 | Multi-turn contextual edits (send active-page JSON/diff, targeted small commands) |

---

## Sequencing

**D1–D2 → G1–G2 → F1–F3 → E1–E2 (parallel-safe, no backend needed) → E3–E6 (backend, can start once D2's schema is stable).**

Reasoning: D's theme/Icon/Frame additions change the element union and are the one thing every later
track (exporters, agent schema, file format's `document.json` shape) has to target — do it first so
nothing downstream gets built twice. G is small and gives a safety net (real save files) before bigger,
riskier agent work starts touching documents. F is pure frontend, high visible payoff, and forces every
element type to be "exportable," a good correctness check on D. E1/E2 (panel UI + linter) don't need a
backend and can be built and demoed with a mock client while E3+ (real Ollama backend) proceeds in
parallel on a separate track once D2's schema stabilizes.

---

## Open decisions (flagged, not assumed)

1. **File extension/name** for Track G — `.dzn` used as a placeholder throughout; pick the real one.
2. **Vision model for reference-image understanding (E5)** — does local Ollama have an installed
   vision-capable model (llava/qwen-vl class) with acceptable latency on this machine, or is a cloud
   vision call acceptable for just this one step? This wasn't part of Phase 2's original Ollama decision
   and changes E5's backend shape.
3. **Selectable-text PDF** — confirmed out of scope for v1 (raster-only, see Track F rationale); revisit
   only if a real use case needs copy-pasteable/searchable exported text.
4. **Per-page vs per-project theming** — this plan scopes `DesignTheme` to one-per-project for simplicity;
   say now if a single project needs multiple pages in different visual styles (e.g. a deck mixing a
   dark title slide with light content slides), since that changes where `ThemeStore` lives.

---

## Out of scope (this phase, unless raised again)

Auth, real multi-user collaboration, cloud storage/sync, animation/transitions on export, full charting
library integration (beyond D4's 2–3 hand-rendered kinds), rich text (mixed styles within one text box),
image cropping/masking, undo across a `.dzn` import boundary (import is one atomic `LoadCanvasCommand`,
like today's localStorage load).
