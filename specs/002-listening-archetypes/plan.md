# Implementation Plan: Listening Archetypes

**Branch**: `002-listening-archetypes` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-listening-archetypes/spec.md`

## Summary

Classify users into one of 8 listening archetypes (Ritualist, Deep Diver, Completionist, Side A Loyalist, Singles Hound, Cherry Picker, Curator, Shuffle Gremlin) based on their recent ~600 scrobbles. The classification uses 6 core metrics computed from existing scrobble and album metadata, scored against archetype profiles using soft-threshold weighted geometric means. Results are displayed as a co-equal section alongside the existing Album Quotient, persisted for sharing, and include personalized stat factoids and an expandable raw metrics panel.

## Technical Context

**Language/Version**: TypeScript 5.7, Node 22 LTS
**Primary Dependencies**: SvelteKit 5, Svelte 5, Tailwind CSS v4, pg (custom DB layer), Pino
**Storage**: PostgreSQL — extend existing `analysis_results` table with nullable JSONB column
**Testing**: Vitest (unit + integration), Playwright (e2e), @testing-library/svelte
**Target Platform**: Node 22 LTS SSR web application
**Project Type**: Full-stack SvelteKit web application
**Performance Goals**: Archetype computation adds < 50ms to existing analysis (pure math on ~600 in-memory scrobbles)
**Constraints**: No new external API dependencies for v1. Reuse existing last.fm data pipeline.
**Scale/Scope**: Same per-request model as existing feature. ~600 scrobbles, 8 archetypes, 6 metrics.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

| Principle | Status | Plan |
|-----------|--------|------|
| I. Testing Correct Behavior | PASS | Unit tests for each metric, scoring, and classification using guide's test fixtures. Integration tests for persistence. Component tests for archetype display. |
| II. Type Safety and Immutable State | PASS | Discriminated union for ArchetypeName, readonly arrays for metrics and definitions, immutable ArchetypeResult objects. |
| III. Beautiful, Delightful & Usable UI/UX | PASS | Archetype display with polished layout, confidence badge, animated stat reveals, consistent typography. Expandable metrics panel with smooth transition. |
| IV. Reactive Design | PASS | Co-equal sections stack vertically on mobile. Touch-friendly metrics toggle. Responsive at all breakpoints. |
| V. Logging | PASS | Log metric computation timing, classification result, and confidence. Performance logging for the full archetype pipeline. |

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Testing | PASS | Test fixtures from guide directly encode expected archetypes with confidence > 0.70. Metric tests use hand-crafted scrobble sets. |
| II. Type Safety | PASS | All new types use readonly properties. ArchetypeName is a string union. MetricCondition configs are `as const`. No mutable shared state. |
| III. UI/UX | PASS | ArchetypeView is a new component with intentional visual hierarchy: archetype name (large), description, confidence badge, interesting stats, expandable metrics. |
| IV. Reactive | PASS | Co-equal layout uses CSS grid/flex that naturally reflows. Metrics detail panel is full-width on all sizes. |
| V. Logging | PASS | `archetype.ts` entry point logs total computation time. Individual metric timings at debug level. |

No violations. Complexity Tracking section not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-listening-archetypes/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: type definitions and DB schema
├── quickstart.md        # Phase 1: development setup guide
├── contracts/
│   └── api.md           # Phase 1: API contract changes
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── server/
│   │   ├── algorithm/
│   │   │   ├── quotient.ts          # Existing (unchanged)
│   │   │   ├── archetype.ts         # NEW: classification entry point
│   │   │   ├── metrics.ts           # NEW: core metric computation
│   │   │   ├── scoring.ts           # NEW: soft-threshold scoring + geometric mean
│   │   │   ├── definitions.ts       # NEW: archetype configs (thresholds, descriptions)
│   │   │   ├── interesting-stats.ts # NEW: factoid generation
│   │   │   ├── enrichment.ts        # NEW: scrobble → enriched scrobble mapping
│   │   │   └── types.ts             # EXTENDED: new algorithm-internal types
│   │   ├── lastfm/
│   │   │   └── client.ts            # Existing (unchanged)
│   │   └── db/
│   │       └── queries.ts           # MODIFIED: persist/retrieve archetypeResult
│   ├── components/
│   │   ├── ResultsView.svelte       # MODIFIED: add archetype section
│   │   ├── ArchetypeView.svelte     # NEW: archetype display component
│   │   └── MetricsDetail.svelte     # NEW: expandable metrics panel
│   └── types.ts                     # EXTENDED: ArchetypeResult, ListeningMetrics, etc.
├── routes/
│   ├── api/
│   │   ├── analyze/+server.ts       # MODIFIED: run archetype after quotient
│   │   └── share/+server.ts         # MODIFIED: accept archetypeResult
│   └── report/[shareId]/
│       ├── +page.server.ts          # MODIFIED: return archetypeResult
│       └── +page.svelte             # MODIFIED: render archetype if present

migrations/
└── 002_add_archetype_result.sql     # NEW: add JSONB column

tests/
├── unit/
│   ├── metrics.test.ts              # NEW: metric computation tests
│   ├── scoring.test.ts              # NEW: scoring system tests
│   ├── archetype.test.ts            # NEW: classification + fixture tests
│   └── interesting-stats.test.ts    # NEW: factoid generation tests
└── integration/
    └── share.test.ts                # MODIFIED: archetype persistence tests
```

**Structure Decision**: Follows the existing SvelteKit project layout. All new algorithm code goes in `src/lib/server/algorithm/` alongside the existing `quotient.ts`, maintaining the established pattern. New components follow the existing `src/lib/components/` convention. This keeps the archetype feature co-located with related code and avoids introducing new top-level directories.

## Design Decisions

### D1: Algorithm Module Decomposition

The archetype algorithm is split into 6 focused modules rather than one large file:

| Module | Responsibility | Testability |
|--------|---------------|-------------|
| `enrichment.ts` | Augment raw scrobbles with track positions from albumInfoMap | Test with known scrobble/album pairs |
| `metrics.ts` | Compute all 6 core metrics from enriched scrobbles | Test each metric independently with crafted data |
| `scoring.ts` | Soft-threshold evaluation and geometric mean aggregation | Test threshold math in isolation |
| `definitions.ts` | Archetype configs: thresholds, weights, descriptions | Static data, validates at type level |
| `interesting-stats.ts` | Generate personalized factoids from metrics + scrobble data | Test factoid selection per archetype |
| `archetype.ts` | Orchestrator: enrichment → metrics → scoring → selection | Integration test with guide fixtures |

**Why**: Each module has a single responsibility, is independently testable, and can be understood without reading the others. The guide's test fixtures validate the full pipeline through `archetype.ts`.

### D2: Reusing Existing Data Pipeline

The existing analysis flow already fetches scrobbles and builds an `albumInfoMap` with full track listings. The archetype algorithm receives these same inputs — no additional API calls needed. The flow becomes:

```
scrobbles + albumInfoMap
  ├── analyzeScrobbles() → AlgorithmResult (existing quotient)
  └── classifyArchetype() → ArchetypeResult (new)
```

Both run in the `/api/analyze` endpoint handler after data fetching completes. The archetype classification is additive — it cannot break the existing quotient calculation.

### D3: Enrichment Layer

Rather than modifying the existing `Scrobble` type (which would require changes throughout the quotient algorithm), a new `EnrichedScrobble` type augments scrobbles with position data. The enrichment step:

1. For each scrobble, look up its album in `albumInfoMap`
2. Match the scrobble's track name to the album's track list (reusing `findTrackPosition()` logic)
3. Attach `trackPosition`, `albumTotalTracks`, and `isCompilation` flags
4. Filter out compilations and short releases as needed per metric

This keeps the existing types stable and gives the metrics module clean, pre-processed input.

### D4: Confidence Level Mapping

Raw confidence scores (0.0–1.0) are bucketed into three human-readable levels for display:

| Score Range | Level | Display Treatment |
|-------------|-------|-------------------|
| ≥ 0.65 | "high" | Strong, definitive presentation |
| 0.30–0.64 | "medium" | Standard presentation |
| < 0.30 | "low" | Hedged presentation with "best guess" language |

These thresholds align with the guide's minimum confidence of 0.30 below which results are flagged.

### D5: Frontend Component Architecture

```
ResultsView.svelte (modified)
├── [existing Album Quotient section]
├── ArchetypeView.svelte (new, co-equal section)
│   ├── Archetype name + confidence badge
│   ├── Description text
│   ├── Secondary archetype (if present)
│   ├── Interesting stats (2–4 factoids)
│   └── MetricsDetail.svelte (new, expandable)
│       └── Raw metric scores with labels
└── ShareButton.svelte (existing, unchanged)
```

`ArchetypeView` is conditionally rendered — only appears when `archetypeResult` is non-null. This provides backward compatibility for old shared reports.

### D6: Database Backward Compatibility

Single nullable JSONB column addition. Migration is non-destructive:

- **Old rows**: `archetype_result IS NULL` → frontend renders without archetype section
- **New rows**: `archetype_result` contains full `ArchetypeResult` JSON
- **Old code reading new rows**: Ignores unknown column (standard SQL behavior)
- **New code reading old rows**: Parses NULL as `archetypeResult: null`

No data backfill needed. Old shared reports gracefully degrade.
