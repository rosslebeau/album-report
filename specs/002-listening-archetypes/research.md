# Research: Listening Archetypes

**Feature**: 002-listening-archetypes
**Date**: 2026-03-15

## R1: Track Position Data Availability

**Decision**: Reuse existing `findTrackPosition()` mechanism from the quotient algorithm.

**Rationale**: The existing algorithm already matches scrobble track names to `AlbumInfo.tracks[]` to find 1-indexed positions. This exact data is needed for TPS (Track Position Skew) and ACR (Album Completion Rate). No new API calls or data sources are required — the `albumInfoMap` already fetched during Album Quotient analysis contains all needed track position data.

**Alternatives considered**:
- Fetching track_number directly from last.fm scrobble API → Not available in the `user.getRecentTracks` response; positions come from album metadata.
- Using MusicBrainz for track positions → Unnecessary since last.fm `album.getInfo` already provides `@attr.rank` per track.

## R2: Enrichment Data Sources (Popularity, Genre)

**Decision**: Defer Popularity Skew (PS) and Genre Coherence (GC) metrics to a future iteration. Ship v1 with 6 core archetypes.

**Rationale**: Track popularity would require Spotify API integration (last.fm doesn't provide per-track popularity). Genre tags could come from last.fm's `artist.getTopTags` but are noisy and require normalization. Both add significant complexity and external dependencies. The 6 core archetypes (Ritualist, Deep Diver, Completionist, Side A Loyalist, Cherry Picker, Shuffle Gremlin) provide complete coverage without enrichment data.

**Alternatives considered**:
- Spotify API for popularity → Requires OAuth flow or client credentials, adds rate limits, and introduces a dependency on users having Spotify accounts linked.
- Last.fm tag API for genres → Available but tags are user-contributed, messy, and would need a normalization/bucketing layer. Better suited as a separate feature enhancement.

## R3: Archetype Definition Structure

**Decision**: Use a declarative configuration object for archetype definitions rather than hardcoded if/else chains.

**Rationale**: Each archetype is defined by a set of metric conditions with thresholds, weights, and ramp zones. A config-driven approach makes thresholds easy to tune (the guide explicitly says they need tuning), keeps the scoring algorithm generic, and ensures all archetypes are evaluated consistently. The evaluation priority order is encoded as array ordering.

**Alternatives considered**:
- Hardcoded per-archetype functions → Easier to read initially, but threshold tuning requires touching logic code. Inconsistent structure makes it hard to verify all archetypes follow the same scoring pattern.
- External configuration file (JSON/YAML) → Over-engineering for 8 archetypes. The config lives in code as a typed constant, benefiting from type checking.

## R4: Weighted Geometric Mean Implementation

**Decision**: Implement as `exp(sum(weight_i * ln(score_i)) / sum(weight_i))` with a floor of 0 when any primary component is 0.

**Rationale**: The guide specifies weighted geometric mean so that any badly-fitting metric pulls the entire score down (unlike arithmetic mean where one perfect score can mask a bad one). The log-space computation avoids floating-point issues with repeated multiplication. A score component of 0 means the archetype definitively doesn't fit, so the geometric mean correctly yields 0.

**Alternatives considered**:
- Arithmetic mean → Doesn't penalize individual bad fits enough; the guide explicitly chose geometric mean for this reason.
- Min-of-components → Too harsh; would ignore all other metrics when one is borderline.

## R5: Database Schema Extension for Archetype Data

**Decision**: Add a single nullable JSONB column `archetype_result` to the existing `analysis_results` table.

**Rationale**: A JSONB column provides flexibility for the archetype data structure (which may evolve as thresholds are tuned and enrichment metrics added) while maintaining backward compatibility — existing rows simply have `NULL` for this column. The column stores the complete archetype classification: primary archetype, confidence, secondary archetype, all metrics, and interesting stats. This avoids a proliferation of nullable columns and keeps the migration simple.

**Alternatives considered**:
- Separate `archetype_results` table with foreign key → Adds join complexity for a 1:1 relationship. The data is always accessed together with the analysis result.
- Multiple individual columns (archetype, confidence, secondary, metrics, stats) → More rigid schema, harder to evolve, requires migration for every new field.

## R6: Soft Threshold Scoring

**Decision**: For each metric condition, define `target` (full score) and `ramp_start` (score begins rising from 0). Score linearly interpolates between these points.

**Rationale**: The guide specifies a ~25% ramp zone below stated thresholds. For a condition like "ACR > 0.65", the ramp zone would be 0.50–0.65 (score rises from 0 to 1). This prevents cliff-edge misclassifications where a user with ACR=0.64 gets 0 and ACR=0.65 gets 1. The linear ramp is simple, predictable, and matches the guide's example.

**Alternatives considered**:
- Hard cutoffs → Guide explicitly rejects these due to cliff-edge misclassification.
- Sigmoid/logistic curve → Smoother but harder to reason about and tune. The guide's example uses linear interpolation.

## R7: Album Filtering Criteria

**Decision**: Implement three filtering categories applied before metric computation.

**Rationale**: The guide specifies several categories of albums that should be excluded from certain calculations to prevent data quality issues.

1. **Short releases** (< 4 tracks): Excluded from ACR and TPS. Trivially score 1.0 completion and have meaningless track positions.
2. **Compilations / "Various Artists"**: Excluded from ACR and TPS. Detected by checking if the album artist is "Various Artists" or similar patterns. Track ordering is editorially curated, not artistically meaningful.
3. **Deluxe/live editions**: Track count capped at 20 to prevent inflated denominators. Albums with > 20 tracks are likely deluxe editions or multi-disc releases where the standard edition track count is lower.

**Alternatives considered**:
- No filtering → Guide explicitly warns this causes systematic ACR depression and Cherry Picker inflation.
- More aggressive filtering (exclude all compilations by metadata lookup) → Would require additional API calls to MusicBrainz. The artist name check catches the most common cases.

## R8: Interesting Stats Generation

**Decision**: Compute a standard set of factoids from the metric data and select the 2–4 most relevant ones based on the assigned archetype.

**Rationale**: Different archetypes make different stats interesting. A Ritualist's most relevant stat is how many times they replayed their top albums. A Cherry Picker's stat is how many albums they touched. By computing all possible stats and selecting based on archetype, we get personalized, relevant factoids without archetype-specific computation paths.

**Standard factoid set**:
- Albums completed (count where completion > 80%)
- Total unique albums touched
- Top artist and their scrobble share percentage
- Unique artist count
- Most-replayed album (if RI is high)
- Average tracks per album listened
- Early/late track preference (if TPS is skewed)

**Alternatives considered**:
- Fixed 2 stats for all archetypes → Less personalized; a Shuffle Gremlin doesn't care about album completion counts.
- Template strings per archetype → Brittle; requires maintaining 8 separate template sets.
