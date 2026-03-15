# Feature Specification: Listening Archetypes

**Feature Branch**: `002-listening-archetypes`
**Created**: 2026-03-15
**Status**: Draft
**Input**: User description: "I want to add a feature that categorizes people into an archetype based on their listening history, using a detailed listening archetypes guide"

## Clarifications

### Session 2026-03-15

- Q: What is the display prominence of the archetype relative to the Album Quotient? → A: Co-equal sections — both are presented with equal visual weight.
- Q: Should end users see raw metric scores (ACR, AC, etc.)? → A: Expandable detail — metrics available behind a "See your metrics" toggle, collapsed by default.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View My Listening Archetype (Priority: P1)

A user visits the app, enters their last.fm username, and — alongside their existing Album Quotient results — sees their listening archetype classification. The archetype reflects their current listening mode over their most recent ~600 scrobbles (3–7 days). The result includes the archetype name, a confidence indicator, and personalized "interesting stats" that give texture to the classification (e.g., "You completed 8 out of 14 albums this week," "Your top artist was Radiohead with 42% of your listening").

**Why this priority**: This is the core value proposition. Without the archetype classification and its display, no other stories matter.

**Independent Test**: Can be fully tested by entering a last.fm username and verifying that an archetype result appears with a name, confidence level, and at least one interesting stat factoid.

**Acceptance Scenarios**:

1. **Given** a user with sufficient listening history (~600 scrobbles), **When** they submit their username for analysis, **Then** they see their primary archetype name, a confidence indicator (high/medium/low), and at least two personalized stat factoids derived from their listening data.
2. **Given** a user whose metrics closely match two archetypes (top two scores within 0.10 of each other), **When** their archetype is displayed, **Then** the result shows both a primary archetype and a secondary archetype (e.g., "You're a Completionist with Deep Diver tendencies").
3. **Given** a user with very few scrobbles (under 100 in the analysis window), **When** their archetype is displayed, **Then** the result is flagged as low confidence regardless of metric scores, with messaging indicating insufficient data for a confident classification.
4. **Given** a user viewing their archetype result, **When** they expand the "See your metrics" toggle, **Then** they see their raw metric scores (ACR, AC, AB, TPS, RI, SE, and any available enrichment metrics) with human-readable labels.

---

### User Story 2 - Understand My Archetype (Priority: P1)

After seeing their archetype classification, the user can understand what it means. Each archetype has a clear name and a short description that explains the listening behavior pattern it represents. The user should immediately recognize themselves (or be surprised in an interesting way) when reading the description.

**Why this priority**: The archetype name alone is meaningless without context. Users need to understand what their classification means to find it valuable and shareable.

**Independent Test**: Can be tested by verifying that each archetype result includes a human-readable description that accurately characterizes the listening pattern.

**Acceptance Scenarios**:

1. **Given** a user classified as any of the 8 archetypes, **When** they view their result, **Then** they see a description of 1–3 sentences explaining what that archetype's listening behavior looks like.
2. **Given** a user with a secondary archetype, **When** they view their result, **Then** the secondary archetype also includes a brief description.

---

### User Story 3 - Share My Archetype Result (Priority: P2)

A user who has received their archetype classification can share it via a persistent link, just like the existing Album Quotient share flow. The shared report page displays both the Album Quotient and the archetype classification together.

**Why this priority**: Sharing is what drives organic growth and makes the feature fun. It builds on the existing share infrastructure but is secondary to the core classification.

**Independent Test**: Can be tested by analyzing a username, sharing the result, and verifying the shared link displays the archetype alongside the Album Quotient.

**Acceptance Scenarios**:

1. **Given** a user who has received their analysis results (Album Quotient + archetype), **When** they share their results, **Then** the shared report page displays both the Album Quotient data and the archetype classification with its description, confidence, and interesting stats.
2. **Given** a previously shared report that did not include archetype data, **When** someone visits that old share link, **Then** the report displays correctly with only the Album Quotient data (no broken layout or errors from missing archetype data).

---

### User Story 4 - Archetype with Optional Enrichment Data (Priority: P3)

When track popularity data or genre tag data is available from enrichment sources, the system uses it to unlock two additional archetypes: Singles Hound (popularity-driven track picking) and Curator (genre/mood-coherent playlist listening). When this data is unavailable, the system gracefully classifies users into the remaining 6 archetypes without those two options.

**Why this priority**: The core classification works with 6 archetypes using data already available from the scrobble and album metadata pipeline. Popularity and genre enrichment add nuance but are not required for a valuable v1.

**Independent Test**: Can be tested by running classification with and without enrichment data and verifying that Singles Hound and Curator only appear when their required data is present, and that classification is still accurate without them.

**Acceptance Scenarios**:

1. **Given** scrobble data without track popularity information, **When** the system classifies a user, **Then** the Singles Hound archetype is excluded from consideration and users who would match it are classified as Cherry Picker instead.
2. **Given** scrobble data without genre tag information, **When** the system classifies a user, **Then** the Curator archetype is excluded from consideration.
3. **Given** scrobble data with track popularity and genre tags available, **When** the system classifies a user, **Then** all 8 archetypes are available for classification.

---

### Edge Cases

- **Missing track position data**: If more than 30% of scrobbles lack track position information, the system disables track-position-based metrics and excludes the Side A Loyalist archetype. This is surfaced in the output.
- **Very short scrobble history**: Users with fewer than 100 scrobbles receive a best-guess archetype but with forced low confidence and a message indicating more listening data is needed.
- **"Unknown Album" scrobbles**: Scrobbles without album information are excluded from album-based metrics but still count toward overall scrobble totals. They contribute to Shuffle Gremlin / Cherry Picker scoring.
- **Singles and very short releases**: Albums with fewer than 4 tracks are excluded from Album Completion Rate and Track Position Skew calculations to prevent trivially perfect scores.
- **Compilation and "Various Artists" albums**: Excluded from Album Completion Rate and Track Position Skew calculations, as their track ordering is not meaningful for listener behavior analysis.
- **Live albums and deluxe editions**: Albums with inflated track counts (due to bonus tracks or multi-disc formats) should have their track counts capped or normalized to prevent artificially depressing completion rates.
- **Podcast scrobbles**: Filtered out entirely (if identifiable by media type or episode-length durations exceeding 15 minutes), as they have no meaningful album structure.
- **Album completion timing at window boundaries**: An album started before the scrobble window may only have its later tracks appear, making the user appear to skip early tracks. Albums whose scrobbled tracks are exclusively from the second half and appear in the first 12 hours of the window should be excluded from completion and position calculations.
- **Backward compatibility of shared reports**: Previously shared reports that predate the archetype feature must continue to display correctly without archetype data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute 6 core metrics from the user's scrobble window: Album Completion Rate (ACR), Artist Concentration (AC), Album Breadth (AB), Track Position Skew (TPS), Repeat Intensity (RI), and Scrobble Entropy (SE).
- **FR-002**: System MUST optionally compute 2 enrichment metrics when data is available: Popularity Skew (PS) and Genre Coherence (GC).
- **FR-003**: System MUST classify each user into exactly one primary archetype from the set: Ritualist, Deep Diver, Completionist, Side A Loyalist, Singles Hound, Cherry Picker, Curator, Shuffle Gremlin.
- **FR-004**: System MUST score all candidate archetypes and select the highest-scoring as primary. Archetype definitions MUST use metric conditions that discriminate refinements (e.g., unique album count thresholds distinguish Ritualist from Deep Diver) so that evaluation order does not affect the result.
- **FR-005**: System MUST use soft-threshold scoring (linear ramp zones below stated thresholds) rather than hard cutoffs to prevent cliff-edge misclassifications.
- **FR-006**: System MUST compute a confidence score (0.0–1.0) for the primary archetype assignment using weighted geometric mean of metric fit components.
- **FR-007**: System MUST identify a secondary archetype when the second-best archetype's score is within 0.10 of the primary.
- **FR-008**: System MUST flag results as "low confidence" when the top archetype score is below 0.30.
- **FR-009**: System MUST cap confidence at 0.30 for users with fewer than 100 scrobbles in the analysis window.
- **FR-010**: System MUST exclude albums with fewer than 4 tracks from ACR and TPS calculations.
- **FR-011**: System MUST exclude compilation and "Various Artists" albums from ACR and TPS calculations when identifiable.
- **FR-012**: System MUST disable TPS-dependent metrics and exclude Side A Loyalist from classification when more than 30% of scrobbles lack track position data.
- **FR-013**: System MUST exclude Singles Hound from classification when track popularity data is unavailable, merging potential matches into Cherry Picker.
- **FR-014**: System MUST exclude Curator from classification when genre tag data is unavailable.
- **FR-015**: System MUST generate at least two human-readable "interesting stats" factoids per classification (e.g., album completion counts, top artist share, album/artist diversity counts).
- **FR-016**: System MUST display the archetype result as a co-equal section alongside the existing Album Quotient result — both with equal visual weight — in the live analysis view and shared report pages.
- **FR-017**: System MUST persist archetype classification data (archetype name, confidence, secondary archetype, metrics, interesting stats) as part of the shareable report.
- **FR-018**: System MUST maintain backward compatibility with previously shared reports that do not contain archetype data.
- **FR-019**: System MUST weight ACR by album length (total tracks) so that longer albums have proportionally more influence on the metric than short releases.
- **FR-020**: System MUST use the Herfindahl-Hirschman Index formula for Artist Concentration calculation.
- **FR-021**: System MUST normalize Scrobble Entropy to a 0–1 range by dividing raw Shannon entropy by log2(unique_albums).
- **FR-022**: System MUST display a human-readable description (1–3 sentences) for each assigned archetype explaining the listening behavior pattern it represents.
- **FR-023**: System MUST provide an expandable detail section (collapsed by default) that displays the user's raw metric scores (ACR, AC, AB, TPS, RI, SE, and any available enrichment metrics) alongside their archetype result.

### Key Entities

- **Listening Archetype**: A classification label representing a user's current listening mode. Has a name, description, confidence score, and associated interesting stats. One of 8 possible types. Not a permanent identity — expected to change week to week.
- **Core Metrics**: A set of 6 required numerical measurements derived from scrobble data (ACR, AC, AB, TPS, RI, SE). Each has a defined range (typically 0.0–1.0) and specific calculation formula.
- **Enrichment Metrics**: A set of 2 optional numerical measurements (PS, GC) that require additional data sources beyond basic scrobble and album metadata. Enable detection of 2 additional archetypes when available.
- **Archetype Fit Score**: A 0.0–1.0 value computed for each candidate archetype representing how well a user's metrics match that archetype's profile. Uses soft thresholds and weighted geometric mean aggregation.
- **Interesting Stats**: Human-readable factoids derived from a user's scrobble data that personalize and contextualize their archetype classification (e.g., completion counts, top artist share, diversity counts).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive their archetype classification within the same interaction flow as their Album Quotient — no additional steps or separate analysis required.
- **SC-002**: Archetype classification correctly identifies the expected archetype for all defined test fixture profiles (Clear Completionist, Clear Ritualist, Clear Deep Diver, Clear Cherry Picker, Clear Side A Loyalist, Clear Shuffle Gremlin) with confidence > 0.70.
- **SC-003**: Borderline cases (where two archetypes are close fits) present both primary and secondary archetypes, giving users a nuanced result rather than a forced binary choice.
- **SC-004**: Each archetype result includes at least 2 personalized stat factoids that reference the user's specific listening data, making results feel individualized rather than generic.
- **SC-005**: The system gracefully degrades when optional data is unavailable — users always receive a valid classification from the available archetype set, never an error or empty result.
- **SC-006**: Previously shared reports without archetype data continue to display correctly after this feature is deployed.
- **SC-007**: Users with insufficient listening data (under 100 scrobbles) receive an honest low-confidence indicator rather than a misleadingly precise classification.

## Assumptions

- The existing scrobble fetching pipeline (600 recent scrobbles from last.fm) provides sufficient data for archetype classification, as specified in the archetypes guide.
- Album metadata (track count, track listing) is already fetched as part of the existing Album Quotient analysis and can be reused for archetype metric computation.
- Track position data (track number within an album) is available from album metadata lookups for the majority of scrobbles. The system handles the case where it is not.
- Track popularity data and genre tags are not currently available in the existing pipeline. The initial implementation will classify users into the 6 core archetypes, with Singles Hound and Curator deferred until enrichment data sources are integrated.
- The scrobble window size (~600 scrobbles) is fixed and matches the existing analysis. No new user input is required for window selection.
- Archetype thresholds from the guide are starting points that may need tuning based on real user data. The system should store raw metrics to facilitate future threshold adjustment.
