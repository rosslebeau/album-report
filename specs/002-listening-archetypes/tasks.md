# Tasks: Listening Archetypes

**Input**: Design documents from `/specs/002-listening-archetypes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Included per project constitution (Principle I: Testing Correct Behavior, Development Workflow: write tests first).

**Organization**: Tasks are grouped by user story. US1 (View Archetype) and US2 (Understand Archetype) are combined into one phase as they are both P1 and tightly coupled — archetype descriptions (US2) are a field in the archetype definitions that US1 renders.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Define all new types and prepare database schema

- [x] T001 Extend shared types — add ArchetypeName union type, ListeningMetrics interface, InterestingStat interface, ArchetypeResult interface, ConfidenceLevel type, and extend AnalysisResult + PersistedAnalysisResult with optional archetypeResult field per data-model.md in src/lib/types.ts
- [x] T002 [P] Add algorithm-internal types — add EnrichedScrobble, ArchetypeDefinition, MetricCondition interfaces per data-model.md in src/lib/server/algorithm/types.ts
- [x] T003 [P] Create database migration — ALTER TABLE analysis_results ADD COLUMN archetype_result JSONB (nullable for backward compatibility) in migrations/002_add_archetype_result.sql

---

## Phase 2: Foundational (Core Algorithm Modules)

**Purpose**: Build the core algorithm modules that all classification depends on

**CRITICAL**: No user story work can begin until this phase is complete

### Tests (write first, must fail before implementation)

- [x] T004 [P] Write unit tests for core metric computations — test ACR (weighted by album track count, excludes <4-track albums), AC (HHI formula), AB (unique albums / total scrobbles), TPS (normalized positions, excludes compilations and <4-track albums), RI (album and track variants), SE (Shannon entropy normalized by log2(uniqueAlbums)) — use hand-crafted enriched scrobble fixtures with known expected values in tests/unit/metrics.test.ts
- [x] T005 [P] Write unit tests for soft-threshold scoring — test scoreCondition() with "above" direction (linear ramp from rampStart to target), "below" direction (inverted ramp), "near" direction (distance from target), boundary values (at target, at rampStart, below rampStart), and weightedGeometricMean() with equal weights, mixed weights, zero component yielding zero, single component — in tests/unit/scoring.test.ts
- [x] T006 [P] Write unit tests for scrobble enrichment — test track position resolution from albumInfoMap (exact, normalized, prefix matching), compilation detection by "Various Artists" artist name, handling of scrobbles with missing album info (null trackPosition and albumTotalTracks), podcast scrobble filtering (duration >15min), deluxe edition track count capping at 20 — in tests/unit/enrichment.test.ts

### Implementation

- [x] T007 [P] Implement scrobble enrichment — for each scrobble, resolve trackPosition from albumInfoMap track listing using exact/normalized/prefix name matching (reuse findTrackPosition logic from quotient.ts), attach albumTotalTracks (capped at 20 to normalize deluxe/live editions per research R7), detect compilations by "Various Artists" or similar artist name patterns, filter out podcast scrobbles (identifiable by duration >15min if available), exclude window-boundary albums (scrobbled tracks exclusively from second half and timestamps within first 12 hours of window) from ACR/TPS-qualifying set — export enrichScrobbles(scrobbles, albumInfoMap) returning readonly EnrichedScrobble[] in src/lib/server/algorithm/enrichment.ts
- [x] T008 [P] Implement core metric computations — computeAlbumCompletionRate (weighted mean of per-album unique tracks heard / total tracks, weighted by album track count, filter to albums with ≥4 tracks), computeArtistConcentration (sum of squared artist shares via HHI), computeAlbumBreadth (unique albums / total scrobbles), computeTrackPositionSkew (mean of (trackPosition-1)/(albumTotalTracks-1) for qualifying scrobbles from ≥4-track non-compilation albums), computeRepeatIntensity (album: 1 - uniqueAlbums/totalAlbumScrobbles, track: 1 - uniqueTracks/totalScrobbles), computeScrobbleEntropy (Shannon entropy over album distribution normalized by log2(uniqueAlbums)), plus stub computePopularitySkew and computeGenreCoherence returning null — export computeAllMetrics(enrichedScrobbles) returning ListeningMetrics in src/lib/server/algorithm/metrics.ts
- [x] T009 [P] Implement scoring system — scoreCondition(value, condition: MetricCondition) with linear interpolation: for "above" direction score rises linearly from 0 at rampStart to 1 at target, for "below" direction inverted, for "near" direction score based on distance from target — and weightedGeometricMean(components: {score, weight}[]) using exp(sum(w*ln(s))/sum(w)) with floor at 0 when any primary score is 0 — export both in src/lib/server/algorithm/scoring.ts
- [x] T010 [P] Define all 8 archetype configurations — ordered by evaluation priority: Ritualist (RI_album>0.70, unique_albums≤8, ACR>0.50), Deep Diver (AC>0.20, ACR>0.45, unique_albums>8), Completionist (ACR>0.65, AC<0.20, SE>0.60), Side A Loyalist (TPS<0.35, ACR 0.25-0.60), Singles Hound (PS>0.10, ACR<0.40, AB>0.05, requiredData:['popularity']), Cherry Picker (ACR<0.35, AB>0.06, TPS 0.35-0.55), Curator (GC>0.60, AC<0.12, ACR<0.35, requiredData:['genre']), Shuffle Gremlin (SE>0.85, AC<0.06, ACR<0.30) — each with name, 1-3 sentence description, MetricCondition[] with thresholds/weights/ramp zones per archetypes guide, and requiredData flags — export ARCHETYPE_DEFINITIONS as const in src/lib/server/algorithm/definitions.ts

**Checkpoint**: Core algorithm modules ready — classification orchestrator can be assembled

---

## Phase 3: User Story 1 & 2 — View & Understand Archetype (Priority: P1) MVP

**Goal**: Users see their archetype classification with name, description, confidence, interesting stats, and expandable raw metrics alongside their Album Quotient

**Independent Test**: Enter a last.fm username, verify archetype result appears with name, confidence badge, description, 2+ stat factoids, and expandable metrics panel as a co-equal section alongside Album Quotient

**Note**: US2 (Understand My Archetype) is satisfied by the archetype descriptions defined in T010 and rendered in T018. No separate implementation needed.

### Tests (write first, must fail before implementation)

- [x] T011 [P] [US1] Write classification tests with archetypes guide fixtures — build synthetic ~600-scrobble datasets for Clear Completionist (12 albums, 8 artists, 90%+ completion), Clear Ritualist (4 albums, 150 scrobbles each), Clear Deep Diver (1 artist 8 albums, 70%+ completion), Clear Cherry Picker (40+ albums, 1-3 tracks each), Clear Side A Loyalist (15 albums, consistently tracks 1-4), Clear Shuffle Gremlin (80+ albums, 50+ artists), Borderline Completionist/Deep Diver (6 albums from 2 artists, 85%+ completion) — verify correct primary archetype with confidence >0.70 for clear cases, secondary archetype within 0.10 for borderline case — in tests/unit/archetype.test.ts
- [x] T012 [P] [US1] Write unit tests for interesting stats generation — verify at least 2 stats returned for each archetype type, relevant stats selected per archetype (e.g. Ritualist gets most-replayed album, Completionist gets albums completed count, Cherry Picker gets albums touched count), correct label/value formatting — in tests/unit/interesting-stats.test.ts
- [x] T013 [P] [US1] Write component tests for ArchetypeView — verify renders archetype name as heading, confidence badge with correct color per level (high=green, medium=amber, low=gray), description text, secondary archetype with "tendencies" phrasing when present and hidden when null, interesting stats as factoid cards, low-confidence messaging for scores <0.30 — using @testing-library/svelte in tests/unit/archetype-view.test.ts
- [x] T014 [P] [US1] Write component tests for MetricsDetail — verify panel is collapsed by default, expands on toggle click, displays all non-null metrics with human-readable labels (not abbreviations), hides null enrichment metrics (popularitySkew, genreCoherence), formats values to 2 decimal places — using @testing-library/svelte in tests/unit/metrics-detail.test.ts

### Implementation

- [x] T015 [P] [US1] Implement interesting stats — compute full factoid set: albums completed (completion>0.80), total unique albums and artists, top artist name and scrobble share %, most-replayed album (highest RI), average tracks per album, early/late track note (if TPS significantly skewed) — select 2-4 most relevant per archetype type — export generateInterestingStats(metrics, enrichedScrobbles, archetypeName) returning readonly InterestingStat[] in src/lib/server/algorithm/interesting-stats.ts
- [x] T016 [US1] Implement classification orchestrator — enrichScrobbles() → computeAllMetrics() → for each archetype in ARCHETYPE_DEFINITIONS: skip if requiredData not satisfied (metrics are null), score all conditions via scoreCondition(), aggregate via weightedGeometricMean() → sort by fit score → select primary (highest), detect secondary (if within 0.10) → derive confidenceLevel from thresholds (≥0.65 high, 0.30-0.64 medium, <0.30 low) → cap confidence at 0.30 if totalScrobbles<100 → generateInterestingStats() → assemble ArchetypeResult with archetypeScores and disabledArchetypes — log total classification time at info level and individual metric times at debug level — export classifyArchetype(scrobbles, albumInfoMap) in src/lib/server/algorithm/archetype.ts
- [x] T017 [US1] Integrate classification into analyze endpoint — after existing analyzeScrobbles() call, call classifyArchetype(scrobbles, albumInfoMap), include archetypeResult in AnalysisResult response alongside existing quotient data — in src/routes/api/analyze/+server.ts
- [x] T018 [P] [US1] Create ArchetypeView component — props: archetypeResult: ArchetypeResult — display archetype name as large heading, confidence badge with color (high=green, medium=amber, low=gray) and label, 1-3 sentence description, secondary archetype with description (if present, e.g. "with Deep Diver tendencies"), interesting stats as styled factoid cards, embed MetricsDetail component — responsive layout (stacks on mobile), smooth reveal animations on stat cards — in src/lib/components/ArchetypeView.svelte
- [x] T019 [P] [US1] Create MetricsDetail component — props: metrics: ListeningMetrics — expandable panel with "See your metrics" toggle button, collapsed by default, smooth height transition on expand/collapse (hardware-accelerated), display each metric with human-readable label (e.g. "Album Completion Rate" not "ACR"), formatted value (2 decimal places), visual range indicator (0-1 bar), skip null enrichment metrics, touch-friendly toggle (≥44px target) — in src/lib/components/MetricsDetail.svelte
- [x] T020 [US1] Update ResultsView — add ArchetypeView as co-equal section alongside existing Album Quotient section with equal visual weight, conditionally render only when result.archetypeResult is non-null (backward compat), maintain consistent spacing and visual hierarchy between sections — in src/lib/components/ResultsView.svelte

**Checkpoint**: User Story 1 & 2 fully functional — users see archetype classification with all details alongside Album Quotient

---

## Phase 4: User Story 3 — Share Archetype Result (Priority: P2)

**Goal**: Archetype classification is persisted alongside Album Quotient when sharing, and displayed on shared report pages

**Independent Test**: Analyze a username, share the result, visit the share link, verify archetype is displayed. Visit an old share link (pre-archetype), verify it displays without errors.

### Tests (write first, must fail before implementation)

- [x] T021 [US3] Write integration tests for archetype persistence — test insertAnalysisResult() with archetypeResult JSONB, test findByShareId() returns parsed ArchetypeResult, test backward compatibility (old rows without archetype_result column value return archetypeResult: null), test null archetypeResult is handled correctly — add test cases in tests/integration/share.test.ts

### Implementation

- [x] T022 [US3] Update database query functions — modify insertAnalysisResult() to include archetype_result column (JSON.stringify the archetypeResult or null), modify row-to-object mapping in findByShareId() to parse archetype_result JSONB back to ArchetypeResult | null — in src/lib/server/db/queries.ts
- [x] T023 [US3] Update share endpoint validation — accept optional archetypeResult field in request body, validate structural shape if present (archetype string, confidence number, metrics object exist), pass through to insertAnalysisResult() — in src/routes/api/share/+server.ts
- [x] T024 [US3] Update report server loader — ensure archetypeResult from findByShareId() is included in page load data passed to the report page — in src/routes/report/[shareId]/+page.server.ts
- [x] T025 [US3] Update report page — verify ResultsView receives archetypeResult from load data and renders ArchetypeView when present, verify old reports (archetypeResult: null) display without archetype section and without layout issues — in src/routes/report/[shareId]/+page.svelte

**Checkpoint**: Sharing fully functional — shared reports include archetype data, old reports unaffected

---

## Phase 5: User Story 4 — Optional Enrichment Data (Priority: P3)

**Goal**: System correctly handles missing enrichment data by excluding dependent archetypes and maintaining accurate classification with remaining archetypes

**Independent Test**: Run classification with null popularity/genre metrics, verify Singles Hound and Curator are excluded, verify a user who would be Singles Hound is classified as Cherry Picker instead

### Tests

- [x] T026 [P] [US4] Write degradation tests — verify: when popularitySkew is null, Singles Hound is in disabledArchetypes and a scrobble profile matching Singles Hound criteria is classified as Cherry Picker instead; when genreCoherence is null, Curator is in disabledArchetypes; when >30% of scrobbles lack trackPosition, Side A Loyalist is in disabledArchetypes and TPS is excluded from scoring; when all enrichment data is present (mock non-null PS and GC), all 8 archetypes are evaluable — add test cases in tests/unit/archetype.test.ts

### Implementation

- [x] T027 [US4] Implement track position data quality gate — in classifyArchetype(), after enrichment, count scrobbles where trackPosition is null, if >30% of total: set TPS to 0.5 (neutral) in metrics, add Side A Loyalist to disabledArchetypes, log warning with percentage of missing position data — update src/lib/server/algorithm/archetype.ts

**Checkpoint**: All user stories complete — classification gracefully handles all data availability scenarios

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [x] T028 Run full test suite and lint — execute npm test and npm run lint, verify all tests pass and no type errors or warnings, fix any issues found
- [x] T029 Write automated Playwright E2E test — verify complete flow: navigate to landing page → enter username → wait for results → assert co-equal Album Quotient and Archetype sections visible → expand metrics detail panel → assert metric values displayed → click share → assert share link generated → navigate to share link → assert archetype displayed on report page — in tests/e2e/archetype.test.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist) — BLOCKS all user stories
- **US1 & US2 (Phase 3)**: Depends on Phase 2 (algorithm modules must exist)
- **US3 (Phase 4)**: Depends on Phase 1 (types) and Phase 3 (ArchetypeView component for rendering). DB queries (T022) only depend on Phase 1 + migration (T003).
- **US4 (Phase 5)**: Depends on Phase 3 (orchestrator must exist to add quality gate)
- **Polish (Phase 6)**: Depends on all previous phases

### User Story Dependencies

- **US1 & US2 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US3 (P2)**: Depends on US1/US2 for ArchetypeView component. DB tasks (T022) can start after Phase 1.
- **US4 (P3)**: Depends on US1 (orchestrator in archetype.ts exists)

### Within Each Phase

- Tests MUST be written and FAIL before implementation begins (constitution)
- Tasks marked [P] can run in parallel
- Non-[P] tasks must wait for their dependencies

### Parallel Opportunities

**Within Phase 1**:
- T002 and T003 can run in parallel (after T001 for shared types, though T002 and T003 don't depend on T001 directly — they can start simultaneously if types.ts extension is quick)

**Within Phase 2**:
- T004, T005, and T006 (tests) can run in parallel
- T007, T008, T009, T010 (implementation) can all run in parallel — they are separate files with no cross-dependencies

**Within Phase 3**:
- T011, T012, T013, and T014 (tests) can run in parallel
- T015, T018, T019 can run in parallel — separate files, no dependencies on each other
- T018 and T019 (frontend components) can be built in parallel with T015 and T016 (backend) — different layers

**Within Phase 4**:
- T022 (DB queries) can start as soon as Phase 1 is done, before Phase 3 completes

**Cross-Phase**:
- Frontend components (T018, T019) only depend on types (Phase 1), so they CAN be built in parallel with Phase 2 algorithm work

---

## Parallel Example: Phase 2 (Foundational)

```
# Write tests in parallel:
T004: "Unit tests for metric computations in tests/unit/metrics.test.ts"
T005: "Unit tests for scoring system in tests/unit/scoring.test.ts"
T006: "Unit tests for scrobble enrichment in tests/unit/enrichment.test.ts"

# Then implement all modules in parallel:
T007: "Scrobble enrichment in src/lib/server/algorithm/enrichment.ts"
T008: "Core metrics in src/lib/server/algorithm/metrics.ts"
T009: "Scoring system in src/lib/server/algorithm/scoring.ts"
T010: "Archetype definitions in src/lib/server/algorithm/definitions.ts"
```

## Parallel Example: Phase 3 (US1 & US2)

```
# Write tests in parallel:
T011: "Classification fixture tests in tests/unit/archetype.test.ts"
T012: "Interesting stats tests in tests/unit/interesting-stats.test.ts"
T013: "ArchetypeView component tests in tests/unit/archetype-view.test.ts"
T014: "MetricsDetail component tests in tests/unit/metrics-detail.test.ts"

# Then implement backend and frontend in parallel:
# Backend track:
T015: "Interesting stats in src/lib/server/algorithm/interesting-stats.ts"
T016: "Classification orchestrator in src/lib/server/algorithm/archetype.ts" (after T015)
T017: "Analyze endpoint in src/routes/api/analyze/+server.ts" (after T016)

# Frontend track (can run simultaneously with backend):
T018: "ArchetypeView component in src/lib/components/ArchetypeView.svelte"
T019: "MetricsDetail component in src/lib/components/MetricsDetail.svelte"

# Then integrate:
T020: "ResultsView update in src/lib/components/ResultsView.svelte" (after T018, T019)
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (types + migration)
2. Complete Phase 2: Foundational (algorithm core modules)
3. Complete Phase 3: US1 & US2 (orchestrator + frontend)
4. **STOP and VALIDATE**: Enter a username, verify archetype displays correctly
5. Deploy/demo if ready — sharing (US3) and enrichment (US4) can follow incrementally

### Incremental Delivery

1. Phase 1 + 2 → Algorithm foundation ready
2. Add Phase 3 → Users see archetypes (MVP!)
3. Add Phase 4 → Users can share archetype results
4. Add Phase 5 → System ready for enrichment data when available
5. Each phase adds value without breaking previous phases

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution requires tests to fail before implementation begins
- Frontend components (T018, T019) can be built concurrently with backend algorithm work
- The existing ShareButton.svelte and +page.svelte need no changes — they already pass the full AnalysisResult object, which now includes archetypeResult via the type extension in T001
- Commit after each task or logical group
