# Derived Data Spec Mapping (MindStorm)
Status Date: January 15th, 2026

## Backend routes inventory (Express)
- `GET /api/health` — health check (`backend/src/server.js`)
- `POST /api/auth/register` — register user (`backend/src/routes/auth.js` → `backend/src/controllers/authController.js`)
- `POST /api/auth/login` — login (`backend/src/routes/auth.js` → `backend/src/controllers/authController.js`)
- `GET /api/auth/me` — current user (`backend/src/routes/auth.js` → `backend/src/controllers/authController.js`)
- `GET /api/entries` — list entries (`backend/src/routes/entries.js` → `backend/src/controllers/entriesController.js#listEntries`)
- `POST /api/entries` — create entry (`backend/src/controllers/entriesController.js#createEntry`)
- `GET /api/entries/:id` — get entry (`backend/src/controllers/entriesController.js#getEntry`)
- `PUT /api/entries/:id` — update entry (`backend/src/controllers/entriesController.js#updateEntry`)
- `DELETE /api/entries/:id` — delete entry (`backend/src/controllers/entriesController.js#deleteEntry`)
- `GET /api/insights` — list insights (`backend/src/routes/insights.js` → `backend/src/controllers/insightsController.js#listInsights`)
- `POST /api/insights/refresh` — recompute insights on demand (`backend/src/controllers/insightsController.js#refreshInsights`)
- `POST /api/ai/analyze` — LLM analysis for entry (sync) (`backend/src/controllers/aiController.js#analyzeEntry`)
- `POST /api/ai/prepare-summary` — LLM prepare summary (sync; uses weekly summaries) (`backend/src/controllers/aiController.js#prepareSummary`)
- `GET /api/derived/snapshot` — fetch snapshot derived doc (`backend/src/controllers/derivedController.js#getSnapshot`)
- `GET /api/derived/weekly-summaries` — fetch weekly summaries (`backend/src/controllers/derivedController.js#getWeeklySummaries`)
- `GET /api/derived/connections` — fetch connections graph (`backend/src/controllers/derivedController.js#getConnectionsGraph`)
- `GET /api/derived/patterns` — patterns + detail (aggregates Entry + EntrySignals + WeeklySummary) (`backend/src/controllers/derivedController.js#getPatterns`)

## Frontend routes (React) → API usage
- `/` (Landing) → no API (`src/pages/HomePage.tsx`)
- `/login` → `POST /api/auth/login` (`src/pages/LoginPage.tsx` + `src/contexts/AuthContext.tsx`)
- `/home` `/dashboard` → `GET /api/derived/snapshot`, `GET /api/derived/weekly-summaries` (`src/pages/HomeDashboardPage.tsx`)
- `/journal` → `GET /api/entries`, `GET /api/insights` (`src/pages/JournalDashboard.tsx`, `src/hooks/useEntries.ts`, `src/hooks/useInsights.ts`)
- `/entry` → `POST /api/ai/analyze`, `POST /api/entries` (`src/pages/EntryEditorPage.tsx`, `src/lib/analyzeEntry.ts`, `src/hooks/useCreateEntry.ts`)
- `/entry/:id` → `GET /api/entries/:id` (`src/pages/EntryDetailPage.tsx`, `src/hooks/useEntry.ts`)
- `/entry/:id/edit` → `GET /api/entries/:id`, `PUT /api/entries/:id`, `POST /api/ai/analyze` (`src/pages/EntryEditPage.tsx`, `src/hooks/useEntry.ts`, `src/hooks/useUpdateEntry.ts`, `src/lib/analyzeEntry.ts`)
- `/check-in` → no API (local-only UI) (`src/pages/CheckInPage.tsx`)
- `/connections` → `GET /api/derived/connections` (`src/pages/ConnectionsPage.tsx`)
- `/prepare` → `POST /api/ai/prepare-summary`, `GET /api/derived/weekly-summaries` (`src/pages/PreparePage.tsx`)
- `/patterns` → `GET /api/derived/patterns`, `GET /api/entries`, `GET /api/insights` (`src/pages/PatternsPage.tsx`, `src/hooks/useEntries.ts`, `src/hooks/useInsights.ts`)
- `/cycles` → no API (placeholder UI) (`src/pages/CyclesGraphPage.tsx`)
- `/settings` → no API (`src/pages/SettingsPage.tsx`)

Notes:
- `useCreateEntry`, `useUpdateEntry`, `useDeleteEntry` also call `POST /api/insights/refresh` after writes.

## Models inventory (Mongoose)
Raw
- `Entry` (`backend/src/models/Entry.js`)
- `User` (`backend/src/models/User.js`)

Derived / analytics
- `EntrySignals` (`backend/src/derived/models/EntrySignals.js`)
- `ThemeSeries` (`backend/src/derived/models/ThemeSeries.js`)
- `ConnectionsGraph` (`backend/src/derived/models/ConnectionsGraph.js`)
- `Cycle` (`backend/src/derived/models/Cycle.js`)
- `SnapshotSummary` (`backend/src/derived/models/SnapshotSummary.js`)
- `LLMGeneration` (`backend/src/derived/models/LLMGeneration.js`)
- `WeeklySummary` (`backend/src/models/WeeklySummary.js`)
- `Insight` (`backend/src/models/Insight.js`)

## Spec → code mapping
### Spec nodes (logic)
| Spec node | Code file(s) | Status |
| --- | --- | --- |
| Raw Entries | `backend/src/models/Entry.js` | Implemented |
| Raw Check-ins | _missing_ | Missing |
| EntrySignals (per entry) | `backend/src/derived/services/derivedService.js#upsertEntrySignals`, `backend/src/derived/models/EntrySignals.js` | Implemented |
| ThemeSeries (aggregated time series) | _no recompute service found_ | Missing |
| ConnectionsGraph (co-occurrence + temporal) | `backend/src/derived/services/connectionsRecompute.js` | Partial (co-occurrence only) |
| Cycles (sequences) | _no recompute service found_ | Missing |
| SnapshotSummary | `backend/src/derived/services/snapshotRecompute.js` | Implemented (uses raw entries + weekly summaries) |
| ExportBundle | _missing_ | Missing |
| LLM cache | `backend/src/derived/models/LLMGeneration.js` (model only) | Missing usage |

### Spec collections (storage)
| Spec collection | Mongoose model | Status |
| --- | --- | --- |
| `entries` | `Entry` | Implemented |
| `checkins` | _missing_ | Missing |
| `entry_signals` | `EntrySignals` | Implemented |
| `theme_series_points` | `ThemeSeries` | Implemented schema, no writer |
| `connections_graph` | `ConnectionsGraph` | Implemented |
| `cycles` | `Cycle` | Implemented schema, no writer |
| `snapshots` | `SnapshotSummary` | Implemented |
| `exports` | _missing_ | Missing |
| `llm_generations` | `LLMGeneration` | Implemented schema, no writer |
| _extra_ | `WeeklySummary`, `Insight` | Present but not in spec |

## Spec edges (dataflow) and current implementation
### Raw → Derived
- `entries → entry_signals`
  - Implemented: `entriesController.js#createEntry/updateEntry` → `derivedService.js#upsertEntrySignals`
  - Trigger: on_save (synchronous)
  - Stored: `EntrySignals`
  - Evidence pointers: stored as `evidenceBySection` inside EntrySignals (from LLM in `aiController.generateEntryEvidence`).

- `entries → weekly_summaries` (not in spec, but exists)
  - Implemented: `entriesController.js#createEntry/updateEntry` → `aiController.generateWeeklySummary`
  - Trigger: on_save (synchronous LLM)
  - Stored: `WeeklySummary`

- `entries → snapshot`
  - Implemented: `snapshotRecompute.js` reads `Entry` + `WeeklySummary` and writes `SnapshotSummary`
  - Trigger: background worker (`derived/worker.js`, every 60s) based on `stale`

### Derived → Derived
- `entry_signals → connections_graph`
  - Implemented: `connectionsRecompute.js` (co-occurrence counts + evidence entry ids)
  - Trigger: background worker (`derived/worker.js`, every 60s) based on `stale`
  - Evidence pointers: `evidenceEntryIds` on edges (from EntrySignals entry ids)

- `theme_series_points → connections_graph` (temporal)
  - Missing: no ThemeSeries recompute, no temporal logic in connections

- `entry_signals → theme_series_points`
  - Missing: no ThemeSeries recompute service

- `theme_series_points → cycles`
  - Missing: no Cycles recompute service

- `theme_series_points + connections_graph + cycles → snapshots`
  - Partial: Snapshot uses `Entry` + `WeeklySummary` (raw + derived), not ThemeSeries/Cycles

- `snapshots → exports`
  - Missing: no ExportBundle model or writer

### LLM usage (sync vs cached)
- `aiController.analyzeEntry` calls LLM synchronously on request (not cached)
- `aiController.prepareSummary` calls LLM synchronously, merges weekly summaries and returns response (not cached in `LLMGeneration`)
- `aiController.generateEntryEvidence` calls LLM synchronously on entry save (evidence is stored in `Entry` + `EntrySignals`)

## Mismatch report
### MAJOR
- No `checkins` raw collection (spec requires raw check-ins).
- `ThemeSeries` and `Cycle` computations are missing. Models exist, but no writer/worker.
- `ConnectionsGraph` ignores temporal signals (ThemeSeries) and uses only co-occurrence.
- LLM is called synchronously for `/api/ai/analyze` and `/api/ai/prepare-summary` with no cache (`LLMGeneration` unused).
- `/api/derived/patterns` reads raw `Entry` + `EntrySignals` directly; not exclusively from derived primitives.
- `ExportBundle` derived collection is missing.

### MEDIUM
- `WeeklySummary` is a derived collection not referenced in the spec; it is generated synchronously by LLM on save.
- `SnapshotSummary` is built from raw entries + weekly summaries rather than from `ThemeSeries`/`ConnectionsGraph`.
- `Insight` collection is computed from raw entries on demand (`/api/insights/refresh`).

### MINOR
- Range keys are inconsistently handled across services (custom `getRangeStartIso` functions appear in multiple files).
- `EntrySignals.pipelineVersion` default is string-based but older data may still have numeric values.

## Fix plan (top 5)
1) Add raw `checkins` model + ingestion route
   - Add `backend/src/models/CheckIn.js`
   - Add `backend/src/routes/checkins.js` + `backend/src/controllers/checkinsController.js`
   - Update server routes in `backend/src/server.js`

2) Implement `ThemeSeries` recompute
   - New service: `backend/src/derived/services/themeSeriesRecompute.js`
   - Input: `EntrySignals` (and CheckIns if added), output: `ThemeSeries`
   - Trigger: worker loop (extend `backend/src/derived/worker.js`)

3) Extend `ConnectionsGraph` to use temporal correlation
   - Update `backend/src/derived/services/connectionsRecompute.js` to incorporate `ThemeSeries` (temporal correlations) and include evidence pointers
   - Store correlation metrics on edges

4) Create `ExportBundle` derived collection
   - New model: `backend/src/derived/models/ExportBundle.js`
   - New recompute service that reads `SnapshotSummary` + `ConnectionsGraph` + `ThemeSeries`
   - Serve via `/api/derived/exports` (new route + controller)

5) LLM cache + async jobs
   - Use `LLMGeneration` for `prepareSummary` and other narrative outputs
   - Move `/api/ai/prepare-summary` to read from cached `LLMGeneration` and return stale if missing
   - Schedule LLM jobs in background worker when derived docs become stale

---
Assumptions:
- No check-in models or routes found under `backend/src/models` or `backend/src/routes`.
- No ThemeSeries/Cycle recompute services were present under `backend/src/derived/services`.
- LLM cache is not wired (no `LLMGeneration` usage in code).
