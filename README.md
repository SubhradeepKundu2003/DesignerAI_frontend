# DesignerAI — Newsletter Design Platform (Frontend)

An AI-powered newsletter design platform. This repository contains the Angular frontend: a page-based **newsletter editing canvas** that will become the rendering target for AI-generated newsletter layouts.

> **Current phase:** building the editable canvas only — no AI, backend, auth, templates, or export yet. See [PLAN.md](PLAN.md) for the full architecture and implementation plan.
>
> **Status:** milestone M1 (scaffolding & workspace shell) is complete — the editor layout, design system, Canvas JSON model and viewport (zoom/pan/fit) are in place. Element rendering, selection and editing follow in M2–M7.

## What this is (and isn't)

- ✅ A focused, page-based newsletter editor — A4 page, safe margins, grid, snapping
- ✅ The foundation for AI-generated layouts (AI will emit Canvas JSON; the editor renders it)
- ❌ Not a Canva/Figma clone, not a general graphics editor, not an infinite canvas

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components, no NgModules) |
| Language | TypeScript |
| State | Angular Signals (RxJS only where event streams help) |
| Rendering | Konva.js (official package, not ngx-konva) |
| Styling | SCSS (design tokens + component-scoped styles) |
| Persistence | localStorage (Canvas JSON) |

## Core Architectural Rule

**Canvas JSON is the single source of truth. Konva only renders it.**

```
User Input ──► Command ──► Canvas JSON (signal store) ──► Reconciler ──► Konva Stage
```

Every mutation (move, resize, rotate, edit, delete) updates the Canvas JSON first via an undoable command; a reconciler then diffs the JSON against the Konva scene graph. The future AI service plugs into the exact same pipeline:

```
User Prompt ──► AI Service (Qwen3.5:9B MLX) ──► Canvas JSON ──► Angular ──► Konva Renderer
```

The AI never manipulates Konva directly.

## Editor Features (this phase)

- **Workspace** — top toolbar, left sidebar, centered canvas, right properties panel, bottom zoom controls
- **Canvas** — white A4 portrait page on a grey workspace, drop shadow, safe margins, mouse-wheel zoom, pan, zoom-to-fit
- **Elements** — text, rectangle, circle, divider, image; all support select / drag / resize / rotate / duplicate / delete / reorder / lock / hide
- **Text** — double-click inline editing, font family/size/color, bold/italic, alignment, letter spacing, line height
- **Images** — upload, replace, opacity, resize, rotate
- **Grid & snapping** — grid toggle, snap-to-grid, alignment guides, safe-area display
- **Layers panel** — rename, lock, hide, reorder, select
- **History** — full undo/redo via the command pattern
- **Save/Load** — Canvas JSON persisted to localStorage (autosave + explicit save)

## Project Structure

```
src/
├── styles.scss  # Global stylesheet
├── styles/      # SCSS partials: design tokens, mixins, reset, typography, forms
└── app/

app/
├── core/        # App-wide singletons (storage, …)
├── layout/      # Editor shell: toolbar, sidebar, properties panel, zoom bar
├── canvas/      # The editor domain
│   ├── models/      # Canvas JSON model (single source of truth / AI contract)
│   ├── state/       # Signal stores: document, selection, viewport, history, settings
│   ├── commands/    # Undoable commands + command bus
│   ├── renderers/   # Konva stage, per-element renderers, reconciler, grid/guides
│   ├── components/  # Canvas workspace, text-edit overlay, layers, property forms
│   ├── services/    # Element factory, snapping, image upload, persistence
│   └── utils/       # ids, geometry, keyboard shortcuts
└── shared/      # Reusable presentational components (inputs, buttons, panels)
```

## Getting Started

```bash
npm install
npm start        # ng serve → http://localhost:4200
```

Other scripts:

```bash
npm run build    # production build → dist/
npm test         # unit tests (Vitest)
```

## Documentation

- [PLAN.md](PLAN.md) — full implementation plan: data model, state design, command system, rendering architecture, milestones
