# Implementation Plan — Newsletter Design Canvas

**Project:** DesignerAI — AI-Powered Newsletter Design Platform
**Phase:** 1 — Editable Newsletter Canvas (no AI, no backend)
**Stack:** Angular 21 (standalone), TypeScript, SCSS, Konva.js, Angular Signals, RxJS (sparingly)

---

## 1. Guiding Principles

1. **Canvas JSON is the single source of truth.** Konva is a dumb renderer. Every mutation flows:
   `User Input → Command → State (Canvas JSON, signals) → Renderer (Konva)`
   Never the reverse. Konva interaction events (dragend, transformend) are *translated into commands* that update the JSON; the renderer then reconciles.
2. **AI-ready by construction.** The future AI service will emit Canvas JSON. Because the renderer consumes only Canvas JSON, AI integration later is: parse JSON → dispatch `LoadCanvasCommand`. Zero renderer changes.
3. **Unidirectional data flow with signals.** State lives in signal-based stores. Components read via `computed()`; they mutate only by dispatching commands.
4. **Command pattern for every mutation.** Undo/redo falls out for free; it is also the audit/AI trail later.
5. **Small components, thin templates.** Layout components compose feature components; feature components delegate to services. No component exceeds ~200 lines.

---

## 2. Dependencies to Add

| Package | Purpose |
|---|---|
| `konva` | Canvas rendering (official package, **not** ngx-konva) |

That is the **only** dependency added. IDs come from a local `generateId()` util (no `nanoid`/`uuid` dep). Styling is SCSS, already configured by the Angular CLI (`inlineStyleLanguage: scss`, component `style: scss`) — no CSS framework, no PostCSS pipeline.

RxJS is already present; use it only for DOM event streams that benefit from operators (e.g. throttled wheel/pointer events), otherwise signals.

### Styling approach (SCSS)

- **Design tokens as CSS custom properties** in `src/styles/_tokens.scss` (`--color-surface`, `--color-border`, `--space-2`, `--radius-md`, `--shadow-panel`, …), declared on `:root`. Custom properties over SCSS variables so runtime theming stays possible and Konva renderers can read the same values via `getComputedStyle` if needed.
- **SCSS partials** in `src/styles/`: `_tokens.scss`, `_mixins.scss` (focus-ring, truncate, custom scrollbar, button reset), `_reset.scss`, `_typography.scss`, `_forms.scss` (shared control styling). `styles.scss` imports them with `@use`.
- **Component-scoped SCSS** for everything else — each component owns its `.scss` file, default Angular emulated encapsulation. Components `@use '../../../styles/mixins' as mx;` for shared mixins; no global class soup.
- **BEM-ish local naming** inside components (`.panel`, `.panel__header`, `.panel--collapsed`). Since styles are encapsulated, names stay short.

---

## 3. Folder Structure

```
src/
├── styles.scss                    # Imports the partials below via @use
├── styles/                        # Global SCSS partials
│   ├── _tokens.scss               # CSS custom properties: colors, spacing, radii, shadows
│   ├── _mixins.scss               # focus-ring, truncate, scrollbar, button reset
│   ├── _reset.scss
│   ├── _typography.scss
│   └── _forms.scss                # Shared input/select/button control styling
└── app/

app/
├── core/                          # App-wide singletons, no UI
│   └── services/
│       └── local-storage.service.ts
│
├── layout/                        # Workspace shell (dumb layout, composes features)
│   ├── editor-shell/              # Grid: toolbar / sidebar / canvas / properties / zoombar
│   ├── toolbar/                   # Top toolbar
│   ├── sidebar/                   # Left sidebar (tools + layers)
│   ├── properties-panel/          # Right panel
│   └── zoom-controls/             # Bottom zoom bar
│
├── canvas/                        # The editor domain
│   ├── models/
│   │   ├── canvas.model.ts        # Canvas, Page, CanvasElement + discriminated unions
│   │   ├── element-types.ts       # TextElement, ShapeElement, ImageElement, DividerElement
│   │   ├── editor-config.ts       # A4 dims, margins, grid size, zoom limits (constants)
│   │   ├── geometry.model.ts      # Point, Size
│   │   └── commands.model.ts      # Command interface
│   │
│   ├── state/
│   │   ├── canvas.store.ts        # Signal store: the Canvas JSON document
│   │   ├── selection.store.ts     # Selected element id(s)
│   │   ├── viewport.store.ts      # Zoom, pan offset
│   │   ├── editor-settings.store.ts # Grid visible, snap on, guides on
│   │   └── history.store.ts       # Undo/redo stacks
│   │
│   ├── commands/
│   │   ├── command-bus.service.ts # execute / undo / redo entry point
│   │   ├── add-element.command.ts
│   │   ├── update-element.command.ts   # move/resize/rotate/props (generic patch)
│   │   ├── delete-element.command.ts
│   │   ├── duplicate-element.command.ts
│   │   ├── reorder-element.command.ts  # bring forward / send backward / layers reorder
│   │   ├── toggle-element.command.ts   # lock/unlock, hide/show
│   │   └── load-canvas.command.ts      # replaces whole document (save/load + future AI)
│   │
│   ├── renderers/
│   │   ├── konva-stage.service.ts      # Stage/layers lifecycle, zoom, pan, DPR
│   │   ├── page-renderer.ts            # White A4 page, shadow, margins, safe area
│   │   ├── element-renderer.ts         # Renderer interface + shared base attributes
│   │   ├── element-renderer.registry.ts# type → renderer lookup (open/closed for new types)
│   │   ├── text.renderer.ts
│   │   ├── shape.renderer.ts           # rect + ellipse, one sceneFunc
│   │   ├── divider.renderer.ts
│   │   ├── image.renderer.ts
│   │   ├── selection-renderer.ts       # Konva.Transformer on the overlay layer
│   │   ├── grid-renderer.ts
│   │   ├── guides-renderer.ts          # alignment guides while dragging
│   │   └── reconciler.ts               # diff Canvas JSON ↔ Konva nodes (create/update/destroy)
│   │
│   ├── components/
│   │   ├── canvas-workspace/           # Hosts the Konva container div, wires services
│   │   ├── text-edit-overlay/          # HTML textarea overlay for dblclick text editing
│   │   ├── layers-panel/
│   │   └── properties/                 # One small form component per element kind
│   │       ├── text-properties/
│   │       ├── shape-properties/
│   │       ├── image-properties/
│   │       └── common-properties/      # x/y/w/h/rotation/opacity shared block
│   │
│   ├── services/
│   │   ├── element-factory.service.ts  # Creates default TextElement, Rect, Circle, …
│   │   ├── canvas-interaction.service.ts # Stage gestures → selection + commands
│   │   ├── snapping.service.ts         # Grid snap + alignment-guide math (pure)
│   │   ├── image-upload.service.ts     # File → dataURL, dimension probing
│   │   └── persistence.service.ts      # Save/load Canvas JSON via LocalStorageService
│   │
│   └── utils/
│       ├── id.util.ts
│       ├── theme.util.ts               # reads design tokens for the Konva renderers
│       ├── geometry.util.ts            # bounds, rotation math, clamping
│       └── keyboard.util.ts            # shortcut map (Del, Ctrl+Z/Y/D, arrows)
│
└── shared/                        # Presentational, domain-agnostic
    └── components/                # icon-button, slider-input, color-input, select-input,
                                   # number-input, panel-section

src/testing/                       # jsdom shims loaded via the test builder's setupFiles
├── setup.ts
├── canvas-context.stub.ts         # 2D context, so Konva can run headless
├── resize-observer.stub.ts        # also lets specs drive a resize
└── canvas-fixtures.ts             # hand-written element builders for specs
```

---

## 4. Data Model (single source of truth)

Discriminated union so the renderer registry, properties panel, and future AI schema all switch on `type` with exhaustive checking:

```ts
interface CanvasDocument {
  version: 1;
  pages: Page[];
}

interface Page {
  id: string;
  width: number;      // 794  (A4 @ 96dpi)
  height: number;     // 1123
  background: string;
  elements: CanvasElement[];   // render order = layer order (index = z)
}

interface BaseElement {
  id: string;
  name: string;                // shown in Layers panel, renamable
  x: number; y: number;
  width: number; height: number;
  rotation: number;            // degrees
  opacity: number;             // 0..1
  locked: boolean;
  visible: boolean;
}

interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string; fontSize: number; fill: string;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
  align: 'left' | 'center' | 'right';
  letterSpacing: number; lineHeight: number;
}

interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rectangle' | 'circle';
  fill: string; stroke: string; strokeWidth: number;
  cornerRadius: number;        // rectangles only
}

interface DividerElement extends BaseElement {
  type: 'divider';
  stroke: string; strokeWidth: number;
  dash: number[];              // [] = solid
}

interface ImageElement extends BaseElement {
  type: 'image';
  src: string;                 // dataURL in this phase
}

type CanvasElement = TextElement | ShapeElement | DividerElement | ImageElement;
```

**Decisions baked in:**
- `elements` array index **is** the z-order (`layer` field dropped in favor of index — one source of order, no sync bugs; bring-forward = array swap).
- `version` field for forward-compatible migrations when the AI schema evolves.
- Everything serializable — no functions, no Konva refs, no DOM refs. `JSON.stringify` round-trips losslessly.

Constants (in `editor-config.ts`): A4 = 794×1123 px, safe margin = 40 px, grid = 20 px, zoom range 10%–400%, zoom step 1.06 per wheel tick.

---

## 5. State Management (Signals)

Each store is an `@Injectable({ providedIn: 'root' })` class wrapping private `signal()`s and exposing `readonly` computed views:

- **CanvasStore** — `document = signal<CanvasDocument>`; exposes `activePage`, `elements`, `elementById(id)`. Mutations only via internal methods that commands call (`_patchElement`, `_insertElement`, …). Uses immutable updates (spread new arrays/objects) so `computed()` and the reconciler see referential changes.
- **SelectionStore** — `selectedIds = signal<string[]>` (array from day one; multi-select is a future-proofing freebie even if UI selects one). `selectedElements = computed(...)`.
- **ViewportStore** — `zoom`, `panX`, `panY` signals + `zoomAt(zoom, pointer)` (anchors the world point under the cursor), `zoomByWheel`, `fitToViewport()`, `resetZoom()`, `setZoom()`. Also holds the viewport and content sizes, and clamps panning so the page stays reachable.
- **EditorSettingsStore** — `gridVisible`, `snapEnabled`, `guidesEnabled` booleans.
- **HistoryStore** — undo/redo stacks of executed commands; `canUndo`/`canRedo` computed for toolbar button state.

Renderer subscription: `canvas-workspace` sets up a single `effect()` that reads `CanvasStore.activePage()` + `SelectionStore` + `EditorSettingsStore` and calls `reconciler.sync(page)`. Viewport changes go through a separate `effect()` touching only stage position/scale (no node churn).

---

## 6. Command System (Undo/Redo)

```ts
interface Command {
  readonly label: string;      // "Move element", "Change fill" — future AI/audit log
  execute(): void;
  undo(): void;
  mergeWith?(next: Command): boolean;  // coalesce e.g. slider drags into one undo step
}
```

- `CommandBus.dispatch(cmd)` → `cmd.execute()` → push to undo stack → clear redo stack.
- `UpdateElementCommand` is a generic `{ id, patch, previous }` — covers move, resize, rotate, and every property edit. `mergeWith` coalesces updates sharing a `mergeKey` (slider scrubs, typing) so one interaction = one undo step. The key identifies the *interaction*, not the property — a control mints a fresh one when its gesture starts — so two visits to the same slider stay two steps. Keyless updates never merge.
- Konva interactions dispatch commands **on gesture end** (`dragend`, `transformend`) with `previous` captured at gesture start; during the gesture Konva moves the node natively for 60 fps, and the JSON commit at the end re-syncs. This is the one sanctioned "Konva-ahead-of-state" window, bounded to a single gesture.
- History cap: 100 entries.

---

## 7. Rendering Architecture (Konva)

**Stage layout** (one `Konva.Stage`, four layers):

1. **Page layer** — white A4 rect + shadow, margin/safe-area dashed guides, grid lines. `listening(false)` on grid/guides for hit-test perf.
2. **Content layer** — one Konva node (or group) per `CanvasElement`, `node.id() = element.id`.
3. **Overlay layer** — `Konva.Transformer` (resize/rotate handles), alignment guide lines, selection outline.
4. (Grid drawn with a cached shape / single `Konva.Shape` sceneFunc rather than N lines.)

**Reconciler** (`reconciler.ts`) — the heart of "JSON → pixels":
- Walk `page.elements`; for each: node exists? → renderer `update(node, el)` (only sets changed attrs); missing? → renderer `create(el)`; leftover nodes → destroy.
- Set `zIndex` from array index.
- Renderers are registered in `element-renderer.registry.ts` keyed by `type` — adding a future element type (e.g. `button`, `qrcode` from AI) = one new renderer file + model extension, no reconciler changes (Open/Closed).
- `locked` → `draggable(false)` + excluded from transformer; `visible` → `node.visible()`.

**Zoom/Pan:**
- Wheel → zoom toward pointer (throttled via rAF); Ctrl+wheel also zooms, plain wheel optionally pans vertically (Canva-style) — decision: **wheel = zoom** (spec asks mouse-wheel zoom), space+drag or middle-mouse = pan.
- Not infinite: clamp pan so the page can't be flung out of view (page must keep ≥80 px overlap with viewport).
- `zoomToFit()` on init: page centered with comfortable padding in the grey workspace.

**Performance tactics:**
- Layer separation (page/grid never redraws during drags).
- `Konva.Transformer` on overlay layer only.
- Batch draws: reconciler calls `layer.batchDraw()` once per sync, not per node.
- Images cached; grid rendered as one cached shape.
- During drag, only guides-renderer recomputes (pure math in `snapping.service`, no store writes per frame).
- Target: 100+ elements at 60 fps for pan/zoom/drag.

---

## 8. Interactions

| Interaction | Flow |
|---|---|
| Select | Click node → `SelectionStore.select(id)`; click empty page → clear. Transformer attaches via effect. |
| Drag | Konva native drag; `dragmove` → snapping service returns snapped pos + active guides; `dragend` → `UpdateElementCommand`. |
| Resize/Rotate | `Konva.Transformer`; on `transformend` convert scale → width/height (reset scale to 1), dispatch command. Text: fixed font size on resize width (reflow), corner anchors scale font. |
| Text edit | Dblclick text node → hide node, position an HTML `<textarea>` overlay matching screen coords/zoom/rotation, on blur/Enter commit via command. |
| Keyboard | Del/Backspace delete, Ctrl+Z/Ctrl+Y (and Ctrl+Shift+Z) undo/redo, Ctrl+D duplicate, arrows nudge 1px (Shift = 10px), Esc deselect / cancel text edit. Disabled while typing in inputs. |
| Snap | Grid snap (20 px) when enabled; alignment guides to page center, page edges, margins, and other elements' edges/centers with 5 px (screen-space) threshold. Guides win over grid when both in range. |
| Upload image | Sidebar button → hidden file input → dataURL → probe natural size → scale to fit within margins → `AddElementCommand`. Replace = patch `src` (+ optional re-fit) via `UpdateElementCommand`. |

---

## 9. UI Composition

**EditorShell** (CSS grid):

```
┌──────────────────────────── Toolbar ────────────────────────────┐
│ Undo Redo │ Duplicate Delete │ Forward Backward │ Grid Snap │ Zoom% │
├────────┬──────────────────────────────────────────┬─────────────┤
│Sidebar │        Canvas Workspace (grey)           │ Properties  │
│ Text   │        ┌──────────────┐                  │ (contextual)│
│ Rect   │        │   A4 page    │                  │             │
│ Circle │        │  w/ shadow   │                  │             │
│ Divide │        └──────────────┘                  │             │
│ Image  │                                          │             │
│ Layers │                                          │             │
├────────┴──────────────────────────────────────────┴─────────────┤
│                    Zoom −  100%  +   Fit                        │
└──────────────────────────────────────────────────────────────────┘
```

- **Sidebar**: two stacked sections rather than tabs — *Insert* (5 tool buttons) on top, *Layers* below, filling the remaining height and scrolling. Keeping both visible means adding an element and finding it in the layer list never costs a tab switch. Layers list = `activePage().elements` reversed (top of list = topmost). Rows: drag-handle reorder, name (dblclick rename), eye toggle, lock toggle; click selects.
- **Properties panel**: `@switch` on selected element `type` → the matching small form component; `common-properties` block (x, y, w, h, rotation, opacity) always shown; empty state ("Select an element") when nothing selected; disabled state when locked. Inputs are shared components (`number-input`, `color-input`, `select-input`, `slider-input`) that emit debounced patches → `UpdateElementCommand` with merge.
- **Toolbar** buttons drive commands; disabled states from `canUndo`/`canRedo`/selection signals. Also Save/Load buttons (persistence).
- **Zoom controls**: −/+ buttons, editable percentage, Fit button.
- Styling: SCSS with design tokens, light neutral palette, grey workspace (`#e8eaed`-ish), subtle 1px borders, lucide-style inline SVG icons (no icon dependency). Shell uses CSS Grid; panels are fixed-width (sidebar 240px, properties 280px), canvas column flexes.

---

## 10. Persistence

- `PersistenceService.save()` → `JSON.stringify(CanvasStore.document())` → localStorage key `designerai:canvas:v1`.
- `load()` → parse, validate minimal shape (version check), dispatch `LoadCanvasCommand` (undoable).
- Autosave: debounced effect (2 s after last change) — writes silently; explicit Save button gives user certainty.
- On app start: load if present, else create a default blank A4 document.
- This same `LoadCanvasCommand` path is exactly what the AI pipeline will call later.

---

## 11. Implementation Order (Milestones)

Each milestone leaves the app compiling and usable.

1. **M1 — Scaffolding & shell** — ✅ **done**
   Konva installed; global SCSS tokens/mixins/reset/forms; default app stripped (router removed — unused this phase); Canvas JSON models + editor-config constants + id util; icon set, `AppIcon`, `IconButton`; `ViewportStore` and `EditorSettingsStore`; all five layout components plus the canvas workspace host, generated with `ng generate`. Grid, snap, zoom and fit controls are live; the workspace previews the page with the real viewport transform. *Verified: production build clean, 23 unit tests pass, dev server renders.*
2. **M2 — Stage & page render** — ✅ **done**
   `KonvaStageService` owns the stage, its three layers (page / content / overlay) and a device-pixel-ratio watch that re-crisps the canvases when the window changes monitor. `PageRenderer` draws the white A4 sheet, its drop shadow and the dashed safe area; shadow and guides are divided by the zoom so they stay a constant size on screen. The workspace host mounts the stage in place of the CSS page preview and pushes the `ViewportStore` transform into it through an effect. Renderers read colours from the SCSS tokens via `readToken`. Test harness gained jsdom shims for the 2D canvas context and `ResizeObserver`, applied globally through `setupFiles`. *Verified: production build clean (260 kB initial), 37 unit tests pass, dev server serves.*
3. **M3 — State, commands, elements render** — ✅ **done**
   `CanvasStore` holds the Canvas JSON and publishes a new document on every change (and deliberately none when a change hits nothing); `SelectionStore` keeps ids and resolves them against the document, so a deleted element simply drops out of the selection; `HistoryStore` moves commands between two stacks and `CommandBus` is the single door every mutation goes through. `AddElementCommand` keeps its element so redo restores the same id at the same depth; `UpdateElementCommand` is the one generic patch command behind move, resize, rotate and every property edit, with `mergeKey`-based coalescing so one gesture is one undo step. `ElementFactory` centres new elements on the page, cascades them so identical shapes never hide each other, and numbers names from the highest already in use. Renderers for text, shape, divider and image sit behind a registry keyed by type; the reconciler diffs the element list against the content layer, creating, updating, reordering by array index and destroying, with one `batchDraw` per sync. `SelectionRenderer` owns the Konva `Transformer` on the overlay layer, sized in screen px at any zoom and offering width-only handles for text and dividers. `CanvasInteractions` delegates listeners on the content layer and translates click, drag and transform gestures into commands on gesture end — the one sanctioned window where Konva runs ahead of state. Sidebar Insert buttons and toolbar undo/redo are live; the pan gesture moved to the middle mouse button so shift can extend the selection. *Verified: production build clean (306 kB initial), 142 unit tests pass, and a headless-Chrome run confirms add → render, click → handles, drag and corner-resize committing, and undo peeling the resize then the move one step at a time, with no console errors.*
4. **M4 — Toolbar & properties** — ✅ **done**
   `DeleteElementCommand`, `DuplicateElementCommand` and `ReorderElementCommand` round out the command set — delete and duplicate both take a list, so a multi-selection Delete or Ctrl+D is one undo step, not one per element. `ElementActions` is the single place that owns "what can currently be done to the selection" (delete, duplicate, bring forward/send backward, arrow-key nudge), shared by the toolbar buttons and by `KeyboardShortcuts`, so their enabled states and their shortcuts can never drift apart. `KeyboardShortcuts` binds Del/Backspace, Ctrl+Z/Y/Shift+Z, Ctrl+D, arrows (nudging `NUDGE.small`/`large` px, held keys collapsing into one undo step via a merge key mints once per physical hold), Esc and the space bar, all disabled while a form control has focus; space is also the workspace's pan modifier now, read by `CanvasInteractions` so a space+left-button gesture pans instead of dragging or selecting, mirroring the existing middle-button path. The properties panel narrows the selection to each concrete element type (rather than templating the union) and renders a always-shown common block — position, size, rotation, opacity — above a per-type form for text, shape and divider (image's own properties wait for the upload flow in M5); every field is a shared, presentational `number-input` / `color-input` / `select-input` / `slider-input` / `panel-section` component that knows nothing about commands, with the merge-key lifecycle (mint on focus, clear on blur) owned by the canvas-domain property components that dispatch the merged `UpdateElementCommand`s. *Verified: production build clean, 183 unit tests pass, and a headless-Chromium run confirms insert → select → edit-in-panel → move-on-canvas, duplicate/delete/undo/redo from the toolbar, and the text and shape forms rendering their full set of controls, with no console errors.*
5. **M5 — Text editing & images** — ✅ **done**
   Double-clicking a text box opens it in `TextEditOverlay`, a real HTML `<textarea>` positioned, rotated and typeset to sit exactly over the Konva node it stands in for; `TextEditingStore` is the one flag that says which element that is, read by the workspace to hide that node and drop it from the transformer while the overlay owns it, and by the overlay itself to know what to render. Entering an edit seeds the textarea from the document once — keyed off the id rather than the element object, and through `untracked` — so a change elsewhere on the canvas mid-edit can never clobber what the user is typing; leaving one restores the node the same way. Enter (not Shift+Enter) or a blur commits through the same generic `UpdateElementCommand` every other edit uses, Escape discards; `measureTextHeight`, a reusable off-stage `Konva.Text`, re-wraps the new copy so the stored height always matches what Konva would draw, and now backs the properties panel's own "Content" field too, which previously left height stale. `ImageUploadService` turns a picked `File` into a data URL and its natural pixel size — the two things `ElementFactory.createImage` needs to place it scaled to the safe area — and now backs both the sidebar's Image tool (previously disabled) and the new `ImageProperties` panel, whose "Replace image" patches only `src` so swapping a photo never reflows the box the user already sized. *Verified: production build clean, 206 unit tests pass, and a headless-Chromium run against the dev server confirms double-click → type → Enter committing and resizing the box, Escape discarding a second edit, Image → file picker → placed at natural size, and Replace image swapping the source in place, with no console errors.*
6. **M6 — Grid, snap, guides, layers panel** — ✅ **done**
   `GridRenderer` draws the background grid as one cached `Konva.Shape` on the page layer — a single `sceneFunc` tracing every line rather than a node per row and column — toggled by the toolbar's existing grid button and gated on `EditorSettingsStore.gridVisible`. `SnappingService` is pure position math: given a dragging box, the other elements and the page, it returns a snapped x/y plus which alignment guides matched, checking page edges, page centre, margins and every other element's edges/centres against a screen-space threshold; grid rounding only fills in an axis no guide has already claimed. `GuidesRenderer` draws the matched guides as a small reused pool of `Konva.Line`s on the overlay layer, next to the transformer. `CanvasInteractions` calls the snapping service on every `dragmove` — overriding the node's native drag position the same sanctioned way a resize is measured after the fact — and clears the guides on `dragend`; `snapEnabled` gates the grid, `guidesVisible` gates the alignment guides, independently. The layers panel (`LayersPanel`) replaces the sidebar's placeholder: rows in reverse paint order (topmost first), click to select, an eye and a lock icon-button per row dispatching the same generic `UpdateElementCommand` the properties panel uses, dblclick-to-rename through an inline input seeded and focused via the same `viewChild` + `effect` pattern the text-edit overlay established, and native HTML drag-and-drop on a grip handle that drops an element into another's array slot through a new `MoveElementCommand` — one undo step, like every other mutation. *Verified: production build clean (357.6 kB initial), 238 unit tests pass, and a headless-Chromium run confirms the grid toggling on, a drag snapping to the page's centre guide with the pink guide line drawn, and the layers panel's select/hide/lock/rename/drag-reorder all reflected on the canvas with no console errors.*
7. **M7 — Persistence & polish** — ✅ **done**
   `LocalStorageService` is the app's only touch of the browser API — a thin JSON get/set/has/remove wrapper that turns a full quota, a disabled store or corrupted JSON into "nothing persists" rather than an exception reaching a command. `PersistenceService` owns a single `designerai:canvas:v1` slot: an `effect()` on `CanvasStore.document()` debounces every change into one autosave write 2s after the last edit, `save()` writes immediately and flashes a `justSaved` signal the toolbar shows as a fading "Saved" chip, and `load()` replaces the document through the new `LoadCanvasCommand` — undoable like every other mutation, so a load can't silently strand unsaved work. `App` calls `restoreOnStartup()` once at boot, which replaces the document directly rather than through a command, since the editor's initial state isn't a user edit and there is no history yet for it to belong to. The toolbar's Save/Load icon buttons (icons already reserved back in M1) round out the persistence group; Load stays disabled until a save exists. *Verified: production build clean (360.4 kB initial), 254 unit tests pass, and a headless-Chrome run against the dev server confirms insert → Save → "Saved" chip → Load enabled, a full page reload restoring the saved shape with a clean (unusable) undo stack, and inserting a second shape then Load reverting to the saved one-shape state with Ctrl+Z undoing the load back to both shapes, with no console errors. Empty/disabled states (properties panel, layers panel, every toolbar action) and cursor feedback (grab/grabbing pan, per-context cursors) were already in place from earlier milestones — this pass found no gaps there requiring changes.

---

## 12. Out of Scope (this phase)

AI, backend (FastAPI/Spring), auth, templates, export, collaboration, comments, version history, plugins, animations, prototyping, auto-layout, database, multi-page UI (model supports `pages[]`, UI shows page 1), image cropping, rich text.

---

## 13. Future AI Integration (design contract)

```
User Prompt → AI Service (Qwen3.5:9B MLX) → Canvas JSON → LoadCanvasCommand → CanvasStore → Reconciler → Konva
```

Guarantees this architecture provides:
- The Canvas JSON schema in `models/` **is** the AI output contract — export it later as a JSON Schema for constrained decoding.
- AI never touches Konva: the only write path is commands into the store, which is exactly the path AI output will use.
- Renderer registry means AI-introduced element types are additive.
- `Command.label` history doubles as an editing trace for AI refinement loops ("move the heading up" → targeted `UpdateElementCommand`).
