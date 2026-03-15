# Quickstart: Listening Archetypes

**Feature**: 002-listening-archetypes
**Date**: 2026-03-15

## Prerequisites

- Node 22 LTS
- PostgreSQL running (via `docker compose up -d`)
- `LASTFM_API_KEY` and `DATABASE_URL` in `.env`
- Existing Album Quotient feature fully working

## Development Setup

```bash
# Start database
docker compose up -d

# Install dependencies (if needed)
npm install

# Run migrations (applies new archetype_result column)
npm run migrate

# Start dev server
npm run dev
```

## Feature Architecture Overview

```
src/lib/server/algorithm/
├── quotient.ts          # Existing — album quotient algorithm (unchanged)
├── archetype.ts         # NEW — archetype classification entry point
├── metrics.ts           # NEW — core metric computation (ACR, AC, AB, TPS, RI, SE)
├── scoring.ts           # NEW — soft-threshold scoring and geometric mean
├── definitions.ts       # NEW — archetype definitions (thresholds, weights, descriptions)
├── interesting-stats.ts # NEW — factoid generation
├── enrichment.ts        # NEW — scrobble enrichment (add track positions to scrobbles)
└── types.ts             # EXTENDED — new types for metrics, archetypes, scoring

src/lib/components/
├── ResultsView.svelte   # MODIFIED — add archetype section as co-equal
├── ArchetypeView.svelte # NEW — archetype display (name, description, confidence, stats)
└── MetricsDetail.svelte # NEW — expandable raw metrics panel

src/routes/api/
├── analyze/+server.ts   # MODIFIED — run archetype classification after quotient
└── share/+server.ts     # MODIFIED — accept and persist archetypeResult

src/routes/report/[shareId]/
├── +page.server.ts      # MODIFIED — return archetypeResult from DB
└── +page.svelte         # MODIFIED — render archetype if present

src/lib/types.ts         # EXTENDED — ArchetypeResult, ListeningMetrics, etc.

migrations/
└── 002_add_archetype_result.sql  # NEW — add JSONB column

tests/unit/
├── metrics.test.ts      # NEW — test each metric computation
├── scoring.test.ts      # NEW — test soft thresholds and geometric mean
├── archetype.test.ts    # NEW — test classification with guide fixtures
└── interesting-stats.test.ts # NEW — test factoid generation

tests/integration/
└── share.test.ts        # MODIFIED — test archetype persistence and backward compat
```

## Key Implementation Order

1. **Types** — Define all new interfaces in `types.ts` and `algorithm/types.ts`
2. **Enrichment** — `enrichment.ts`: augment scrobbles with track positions from albumInfoMap
3. **Metrics** — `metrics.ts`: compute all 6 core metrics from enriched scrobbles
4. **Scoring** — `scoring.ts`: soft-threshold scoring, geometric mean
5. **Definitions** — `definitions.ts`: archetype configs with thresholds and descriptions
6. **Classification** — `archetype.ts`: orchestrate metrics → scoring → selection
7. **Interesting Stats** — `interesting-stats.ts`: generate factoids per archetype
8. **Migration** — `002_add_archetype_result.sql`: add JSONB column
9. **API Integration** — Update analyze/share endpoints
10. **Frontend** — New components + ResultsView integration

## Running Tests

```bash
# All tests
npm test

# Watch mode during development
npm run test:watch

# Lint (TypeScript + Svelte checking)
npm run lint
```

## Verifying the Feature

1. Enter a last.fm username on the landing page
2. Results should show Album Quotient AND Archetype as co-equal sections
3. Archetype section shows: name, description, confidence badge, 2+ interesting stats
4. "See your metrics" toggle expands to show raw metric values
5. Sharing persists both quotient and archetype data
6. Old share links (without archetype) still display correctly
