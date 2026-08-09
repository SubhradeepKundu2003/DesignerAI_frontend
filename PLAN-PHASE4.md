# Implementation Plan — Phase 4: Backend & Data Persistence

**Project:** DesignerAI — AI-Powered Newsletter Design Platform
**Builds on:** [PLAN.md](PLAN.md) (Phase 1, complete), [PLAN-PHASE2.md](PLAN-PHASE2.md) (Track A/B
complete, Track C/AI not started), [PLAN-PHASE3.md](PLAN-PHASE3.md) (Track D1–D2 and G1–G2 complete;
Track D3, G3, F, E not started)

**Why this phase, and why now:** every other track in Phase 2 and Phase 3 — the AI agent, the export
pipeline, even the `.dzn` file format — was scoped assuming the editor stays a single-browser,
single-project, `localStorage`-only tool. That assumption is now the limiting factor, not a detail to
defer: no accounts, no cross-device access, no server-side backup, and a silent failure mode when a
design's inline images exceed the `localStorage` quota. This phase fixes the data layer before more
features get built on top of it.

---

## 0. What's already true (don't rebuild)

- `CanvasDocument` (`src/app/canvas/models/canvas-document.model.ts`) is already exactly the JSON shape
  a backend needs to store — `pages: Page[]`, each with `elements: CanvasElement[]` carrying x/y/width/
  height coordinates, plus an optional `theme`. This phase stores that tree as-is; it does not change
  the document schema.
- `ImageElement.src`'s own doc comment already says *"Data URL in this phase; a remote URL once a
  backend exists."* — this is that phase.
- Track G2 (`ProjectFileService.exportProject`) already solved "don't inline every image forever": images
  over a size threshold get content-hashed and written once to `assets/`, referenced by an `asset:`
  URI. Phase 4 reuses that exact pattern server-side — hash-dedupe, size threshold, externalized blob —
  instead of designing asset storage from scratch.
- Phase 2 Track C already decided the backend framework (**FastAPI**, talking to a local model) for the
  AI agent, which never got built. Phase 4 stands that backend up now for persistence, so Track E later
  is "add an endpoint to an existing service," not "stand up a second backend."
- The Angular app currently has **no** `HttpClient` provider, no `environment.ts`, and no router
  (`app.config.ts` only registers `provideBrowserGlobalErrorListeners`). All three are foundational
  wiring this phase has to add, not something to assume exists.

## 1. The concrete problem with today's persistence

`PersistenceService` (`src/app/canvas/services/persistence.service.ts`) debounce-writes the whole
`CanvasDocument` to one `localStorage` key (`designerai:canvas:v1`). Consequences:

- **One project, one browser, one device.** There is no concept of "which project" — the app *is* the
  document in that single slot. Opening the app on another machine starts from nothing.
- **Silent data loss on quota overflow.** `LocalStorageService.set()` catches the quota exception and
  returns `false`; `PersistenceService.writeDocument` only reads that return value to decide whether to
  flip `hasSave` — there is no user-visible error. A design with a few uncompressed pasted screenshots
  can quietly stop autosaving with no indication anything is wrong.
- **No backup independent of the browser.** Clearing site data, a corrupted profile, or a fresh install
  loses the project outright. `.dzn` export (Track G) is a *manual*, file-based mitigation — valuable as
  a portability/backup format, not a substitute for continuous, off-device persistence.

## 2. Non-goal for this phase

Real-time multi-user collaboration (two people editing one project live) is explicitly **not** in scope
— see §6. This phase is about one user's work being durable and reachable from more than one place, not
concurrent editing.

---

## Track H — Backend service foundation

**Goal:** a real service and database behind the editor, reusing the Phase 2 Track C framework choice.

- New sibling folder `designerai-backend/` (Python, **FastAPI**), alongside `designerai-frontend/`.
- **Database:** SQLite for v1 — zero ops, file-based, matches this project's actual current scale
  (single user, local use). Schema designed so a later move to Postgres is a connection-string change,
  not a rewrite (plain SQLModel/SQLAlchemy models, no SQLite-specific features). Flagged as an open
  decision below rather than assumed permanent.
- **Schema:**
  - `projects` — `id`, `owner_id` (nullable until Track J exists), `title`, `format_version`,
    `created_at`, `updated_at`
  - `project_documents` — the `CanvasDocument` JSON stored as a JSON column keyed by `project_id`; same
    shape the frontend already produces, no server-side transformation
  - `assets` — `id`, `project_id`, `content_hash`, `mime_type`, `byte_size`, `storage_path` — the DB
    row-per-image equivalent of Track G2's `assets/img-<hash>.png` convention; the document JSON
    references an asset the same way it already does for `.dzn` (`asset:img-<hash>.png` scheme), just
    resolved against this table instead of a zip entry
  - Actual image bytes: local disk under a data directory for v1 (simplest possible thing that works);
    S3-compatible object storage is a clean later swap if/when this stops running on one machine
    (flagged below, not built now)
- **Endpoints:** `POST/GET/PATCH /projects`, `GET/PUT /projects/{id}/document`, `POST /projects/{id}/
  assets` (upload, returns hash-based id), `GET /assets/{id}` (fetch bytes). CORS open for
  `localhost:4200` in dev.
- **Reuses, doesn't duplicate, Track G2's asset logic:** the hashing/threshold code in
  `data-url.util.ts` and `ProjectFileService.externalizeAssets` is the client-side half of this same
  idea; Track I below calls the same functions, just POSTs the externalized bytes to `/assets` instead
  of zipping them.

### Milestones

| # | Deliverable |
|---|---|
| H1 | FastAPI skeleton, SQLite + SQLModel schema (projects, project_documents, assets), `/health` |
| H2 | Project CRUD + `GET/PUT` document endpoints, round-tripping a real `CanvasDocument` |
| H3 | Asset upload/fetch endpoints; disk-backed blob storage keyed by content hash |

---

## Track I — Frontend integration

**Goal:** the editor talks to Track H instead of (or in addition to) `localStorage`.

- Add `provideHttpClient` and `environment.ts`/`environment.prod.ts` (`apiBaseUrl`) — the first backend
  wiring in the Angular app.
- New `ProjectApiService`: `createProject`, `listProjects`, `getDocument`, `saveDocument`, `uploadAsset`,
  `assetUrl(id)`.
- **`PersistenceService` rework:** keep the existing debounce-write pattern (`AUTOSAVE_DELAY_MS`), but
  the write target becomes the backend; `localStorage` demotes to an **offline cache** (so editing still
  works through a network blip, and there's a same-tab-reload fast path) rather than the source of
  truth. Same `justSaved`/`hasSave` signal shape the toolbar already reads — UI barely changes.
- Externalize large images through the *same* `externalizeAssets`/`rehydrateAssets` functions Track G2
  already wrote, pointed at `ProjectApiService.uploadAsset` instead of `JSZip` — one hashing/threshold
  implementation, two consumers (file export and server save), exactly like the thumbnail-snapshot reuse
  in Track G/F.
- **New "My Projects" screen** — the first place `Router` enters this app. A project list (create, open,
  rename, delete) becomes the landing route; the canvas editor becomes a routed child
  (`/projects/:id`). This is a real structural addition, not a detail: today the app has no routing at
  all because there was only ever one implicit project.
- **Conflict policy for v1: last-write-wins**, single active tab/device assumed. Multi-tab or
  multi-device concurrent edits on the same project are an explicit non-goal here (§6) — revisit only if
  it becomes a real usage pattern.

### Milestones

| # | Deliverable |
|---|---|
| I1 | `ProjectApiService` + environment/HttpClient wiring; manual save/load against the backend works |
| I2 | Autosave debounce writes to the backend; `localStorage` becomes fallback cache, not primary |
| I3 | Asset externalization wired to `/assets` upload/fetch, reusing Track G2's hash/threshold code |
| I4 | Router + "My Projects" list screen (create/open/rename/delete); editor becomes a routed view |

---

## Track J — Auth (scope to be decided, don't build blind)

There are currently **zero accounts** — everything is implicitly single-user. Two honest paths, and
this plan deliberately doesn't pick one for you (see Open decisions):

- **(a) Stay single-user.** One implicit default owner server-side — same trust model as today's
  `localStorage`, just moved to a server you run. No login screen, no password storage, nothing to get
  wrong security-wise. Right choice if this stays a personal/local tool.
- **(b) Real accounts** (email/password or OAuth) — only worth building once there's an actual reason:
  hosting this for more than one person, or sharing a project via a link. Pulls in session/token
  handling, password storage or an OAuth provider, and per-user authorization checks on every Track H
  endpoint.

Recommendation: ship (a) first — it's most of Track H/I's value with none of the risk — and only build
(b) when a concrete multi-user or hosting need shows up.

---

## Track K — Migration & rollout

- **One-time import on first load after this ships:** detect an existing `designerai:canvas:v1` in
  `localStorage`; if found, offer "Import as a new project" into the backend before the old key is ever
  cleared. No one's current work disappears silently when this ships.
- `.dzn` export/import (Track G) keeps working unchanged as the portability/backup format — it now
  reads from and writes into whichever project is currently open server-side, instead of the single
  `localStorage` slot.

### Milestones

| # | Deliverable |
|---|---|
| K1 | Startup check + one-time "import your local design" flow into the new backend |
| K2 | `.dzn` export/import re-verified against a backend-loaded project (no behavior change expected, just re-tested against the new source of truth) |

---

## Sequencing

**H1–H3 → I1–I3 (editor works against the backend, offline-cache-first) → I4 (multi-project UI/routing)
→ K1–K2 (migrate existing local users) → J only if/when a real multi-user or hosting need exists.**

Reasoning: the backend and document/asset endpoints (H) have to exist before anything in the frontend
can point at them (I). Multi-project UI (I4) is sequenced after single-project save/load works, so
there's a working save path to validate before the "which project" concept is layered on top. Migration
(K) comes last so it moves real user data into a proven, already-tested path rather than a moving
target. Auth (J) is deliberately last and conditional — building it before there's a reason is exactly
the kind of premature scope this plan is trying to avoid elsewhere.

**Where this leaves the still-unfinished Phase 3 tracks:**
- **Track E (AI agent)** was already scoped against a FastAPI backend that didn't exist (Phase 2 Track
  C). Once Track H ships, Track E becomes "add `/generate` to the existing service," not "stand up a
  whole new one" — do it after Phase 4, not before.
- **Track F (export)** and **Track G3 (format migration)** don't depend on a backend and can be picked
  up independently, in parallel with Phase 4 or after — whichever the user prioritizes next.
- **Track D3 (block library maturity)** is unaffected either way.

---

## Open decisions (flagged, not assumed)

1. **SQLite vs Postgres for v1** — recommending SQLite given current single-user/local scale; say now if
   hosted multi-user access is a near-term goal, since that changes the deployment story from day one.
2. **Local disk vs S3-compatible object storage** for asset bytes — recommending local disk for v1
   (simplest thing that works); revisit if the backend ever needs to run somewhere other than this
   machine.
3. **Auth scope (Track J)** — single implicit user, or real accounts? See Track J's reasoning; this is
   the biggest scope fork in this whole phase and materially changes Track H's endpoint design
   (per-user authorization checks or not) if answered "real accounts" instead of deferred.
4. **Is this becoming a hosted, possibly multi-user product, or staying a personal tool run on one
   machine?** The honest single biggest input to every other open decision here — worth answering before
   Track H's schema is finalized, since retrofitting `owner_id`-based isolation after data exists is
   more work than designing for it from H1.
5. **Keep `localStorage` as a permanent offline cache, or fully retire it once the backend is reliable?**
   Recommending "keep it as cache" (Track I) since it's cheap insurance against a network blip mid-edit
   and the code already exists — but confirm this is wanted rather than seen as leftover complexity.

---

## Out of scope (this phase, unless raised again)

Real-time collaboration (concurrent multi-user editing on one project), granular version history/
branching beyond in-session undo, project sharing via public links, teams/billing, offline-first conflict
resolution beyond last-write-wins.
