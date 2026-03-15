# Data Model: Listening Archetypes

**Feature**: 002-listening-archetypes
**Date**: 2026-03-15

## New Types

### ArchetypeName

Union of all possible archetype identifiers.

```
Values: "Ritualist" | "Deep Diver" | "Completionist" | "Side A Loyalist" |
        "Singles Hound" | "Cherry Picker" | "Curator" | "Shuffle Gremlin"
```

### ListeningMetrics

All computed metrics for a scrobble window. Core metrics are always present; enrichment metrics are optional.

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `albumCompletionRate` | number | 0.0–1.0 | Weighted mean of per-album track completion |
| `artistConcentration` | number | 0.0–1.0 | Herfindahl-Hirschman Index of artist shares |
| `albumBreadth` | number | 0.0–~0.20 | Unique albums / total scrobbles |
| `trackPositionSkew` | number | 0.0–1.0 | Mean normalized track position (0.5 = no skew) |
| `repeatIntensityAlbum` | number | 0.0–1.0 | 1 - (unique albums / total album scrobbles) |
| `repeatIntensityTrack` | number | 0.0–1.0 | 1 - (unique tracks / total scrobbles) |
| `scrobbleEntropy` | number | 0.0–1.0 | Normalized Shannon entropy over album distribution |
| `popularitySkew` | number or null | ~-0.5–0.5 | Mean popularity skew vs album average (null if unavailable) |
| `genreCoherence` | number or null | 0.0–1.0 | Top 3 genres' share of all tags (null if unavailable) |
| `uniqueAlbums` | number | integer | Total distinct albums in the window |
| `uniqueArtists` | number | integer | Total distinct artists in the window |
| `totalScrobbles` | number | integer | Total scrobbles in the window |
| `qualifyingAlbums` | number | integer | Albums with ≥ 4 tracks (used for ACR/TPS) |

### InterestingStat

A single human-readable factoid.

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Short descriptor (e.g., "Albums completed") |
| `value` | string | The stat value (e.g., "8 out of 14") |
| `detail` | string or null | Optional longer explanation |

### ArchetypeResult

Complete classification output for one analysis.

| Field | Type | Description |
|-------|------|-------------|
| `archetype` | ArchetypeName | Primary archetype assignment |
| `confidence` | number (0.0–1.0) | Fit score of the primary archetype |
| `confidenceLevel` | "high" \| "medium" \| "low" | Human-readable confidence bucket |
| `description` | string | 1–3 sentence description of the archetype behavior |
| `secondaryArchetype` | ArchetypeName or null | Second-best if within 0.10 of primary |
| `secondaryDescription` | string or null | Description of secondary archetype (if present) |
| `metrics` | ListeningMetrics | All computed metric values |
| `interestingStats` | InterestingStat[] | 2–4 personalized factoids |
| `archetypeScores` | Record<ArchetypeName, number> | Fit scores for all evaluated archetypes (for debugging/tuning) |
| `disabledArchetypes` | ArchetypeName[] | Archetypes excluded due to missing data |

### ConfidenceLevel Derivation

| Confidence Score | Level |
|-----------------|-------|
| ≥ 0.65 | "high" |
| 0.30–0.64 | "medium" |
| < 0.30 | "low" |

## Modified Types

### AnalysisResult (extended)

Add optional archetype field to existing interface:

| Existing Fields | (unchanged) |
|----------------|-------------|
| `username` | string |
| `albumQuotient` | number |
| `totalAlbumsAsUnit` | number |
| `topAlbum` | TopAlbum or null |
| `totalScrobbles` | number |
| `albumRuns` | readonly AlbumRun[] |
| **New Field** | |
| `archetypeResult` | ArchetypeResult or null |

The field is nullable to support the existing flow where archetype computation could theoretically be skipped, and for type compatibility with the share validation.

### PersistedAnalysisResult (extended)

Same extension — adds `archetypeResult: ArchetypeResult | null`. Old persisted records without archetype data will have `null` here.

## Internal Algorithm Types (not persisted or exposed to frontend)

### EnrichedScrobble

A scrobble augmented with position data from the album metadata lookup.

| Field | Type | Description |
|-------|------|-------------|
| `track` | string | Track name |
| `artist` | string | Artist name |
| `album` | string | Album name |
| `timestamp` | number | Unix timestamp |
| `trackPosition` | number or null | 1-indexed position on album (null if not found) |
| `albumTotalTracks` | number or null | Total tracks on the album (null if album info unavailable) |
| `isCompilation` | boolean | True if "Various Artists" or similar |
| `albumMbid` | string or undefined | MusicBrainz ID |

### ArchetypeDefinition

Configuration object for one archetype's scoring rules.

| Field | Type | Description |
|-------|------|-------------|
| `name` | ArchetypeName | Archetype identifier |
| `description` | string | 1–3 sentence description |
| `conditions` | MetricCondition[] | Scoring conditions |
| `requiredData` | ("popularity" \| "genre")[] | Enrichment data this archetype depends on |

### MetricCondition

One scoring condition within an archetype definition.

| Field | Type | Description |
|-------|------|-------------|
| `metric` | string | Which metric to evaluate |
| `direction` | "above" \| "below" \| "near" | Whether higher, lower, or closer-to-target is better |
| `target` | number | Threshold for full score (1.0) |
| `rampStart` | number | Threshold where score begins rising from 0.0 |
| `weight` | number | 1.0 for primary metrics, 0.5 for secondary |

## Database Migration

### New column on `analysis_results`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `archetype_result` | JSONB | YES | NULL |

Nullable for backward compatibility — existing rows retain NULL. New rows always populate this column.

### Migration SQL sketch

```sql
ALTER TABLE analysis_results
ADD COLUMN archetype_result JSONB;
```

No index needed on JSONB — archetype data is only accessed by loading a full row via `share_id`.

## Entity Relationships

```
AnalysisResult (1) ──contains──> (0..1) ArchetypeResult
ArchetypeResult (1) ──contains──> (1) ListeningMetrics
ArchetypeResult (1) ──contains──> (2..4) InterestingStat[]
ArchetypeResult (1) ──references──> (1) ArchetypeName (primary)
ArchetypeResult (1) ──references──> (0..1) ArchetypeName (secondary)
```

## Data Volume

- **Per analysis**: One `ArchetypeResult` object (~2–4 KB as JSON). Contains 12–14 metric values, 2–4 interesting stats, 6–8 archetype scores.
- **Storage growth**: Negligible. The existing `album_runs` JSONB column is already the largest field per row (can be 10–50 KB for users with many album runs). Archetype data adds ~5% to row size.
