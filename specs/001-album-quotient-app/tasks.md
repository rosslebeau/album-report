# Tasks: Album Quotient App

**Input**: Design documents from `/specs/001-album-quotient-app/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Required per constitution (Development Workflow mandates TDD). Tests are written FIRST and MUST fail before implementation begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Project initialization, tooling, and containerization

- [x] T001 Initialize SvelteKit project with TypeScript and Node adapter in project root (package.json, svelte.config.js, tsconfig.json, src/app.html)
- [x] T002 Configure Tailwind CSS v4 via @tailwindcss/vite plugin in vite.config.ts and create src/app.css with @import "tailwindcss"
- [x] T003 [P] Install pg and @types/pg as the database client (no ORM)
- [x] T004 [P] Install and configure Vitest with @testing-library/svelte and jsdom in vite.config.ts
- [x] T005 [P] Install and configure Playwright in playwright.config.ts with webServer pointing to preview server
- [x] T006 Create docker-compose.yml with SvelteKit app (port 3030, configurable via APP_PORT) and PostgreSQL 16 (port 3031, configurable via DB_PORT) services
- [x] T007 [P] Create multi-stage Dockerfile using node:22-slim (build stage + production stage, CMD node build)
- [x] T008 [P] Create .dockerignore (node_modules, build, .svelte-kit, .env) and .env.example (LASTFM_API_KEY, DATABASE_URL, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)

**Checkpoint**: Project scaffolding complete — `npm run dev` starts the SvelteKit dev server, `docker compose up` builds and starts both containers.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, database schema, logging, and last.fm client that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Define shared TypeScript types (AnalysisResult, AlbumRun, TopAlbum, ApiError) as readonly interfaces in src/lib/types.ts
- [x] T010 [P] Write raw SQL migration for analysis_results table (id UUID DEFAULT gen_random_uuid(), share_id VARCHAR(12) UNIQUE NOT NULL, username VARCHAR(100) NOT NULL, album_quotient NUMERIC(5,2) NOT NULL, total_albums_as_unit INTEGER NOT NULL, top_album_name VARCHAR(500), top_album_artist VARCHAR(500), total_scrobbles INTEGER NOT NULL, album_runs JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()) in migrations/001_create_analysis_results.sql
- [x] T011 [P] Create structured logger using pino with rotating file transport (pino-roll), timestamp/level/source context format, and log level configuration in src/lib/server/logger.ts
- [x] T012 Create pg Pool instance using DATABASE_URL from $env/static/private in src/lib/server/db/index.ts, export typed query helper function that wraps pool.query with logging
- [x] T013 Define last.fm API response types (RecentTracksResponse, AlbumInfoResponse, LastfmTrack, LastfmAlbumInfo) matching the #text and @attr quirks documented in research.md, in src/lib/server/lastfm/types.ts
- [x] T014 [P] Define algorithm types (Scrobble, AlbumInfo, AlbumTrack, AlbumRunCandidate, AlgorithmResult) in src/lib/server/algorithm/types.ts
- [x] T015 Implement last.fm API client with getRecentTracks (paginated, 200/page, filters nowplaying) and getAlbumInfo (normalizes single-track array quirk) methods, with User-Agent header and performance logging, in src/lib/server/lastfm/client.ts
- [x] T016 Create migration runner in src/lib/server/db/migrate.ts that reads SQL files from migrations/ directory in order and executes them against Postgres (tracks applied migrations in a migrations table), and create typed query functions (insertAnalysisResult, findByShareId) in src/lib/server/db/queries.ts with explicit row-to-interface mapping

**Checkpoint**: Foundation ready — database schema applied, logger operational, last.fm client can fetch scrobbles and album info. User story implementation can now begin.

---

## Phase 3: User Story 1 — Generate Album Quotient (Priority: P1)

**Goal**: User enters a last.fm username and receives album quotient analysis results

**Independent Test**: Enter a valid username, verify loading state appears, analysis completes, and all three metrics (album quotient %, total albums as unit, top album) display correctly

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US1] Write unit tests for album run detection in tests/unit/algorithm.test.ts: test consecutive album tracks form a run, gaps in track positions are allowed (ascending order), different albums break a run, single-track sequences do not qualify, short albums (1-4 tracks) qualify with ≥2 tracks, standard albums qualify with ≥3 tracks, weight is 1.0 for track-1 starts / 0.9 for mid-album / 0.5 for short albums, quotient calculation matches (sum weights / total) × 100
- [x] T018 [P] [US1] Write unit tests for last.fm client in tests/unit/lastfm-client.test.ts: test nowplaying tracks are filtered out, album name extracted from #text field, pagination collects across multiple pages, single-track album.getInfo response normalized from object to array, error responses (HTTP 200 with error JSON) are handled
- [x] T019 [P] [US1] Write integration tests for POST /api/analyze — covered by E2E tests (full flow, error states) in e2e/album-report.test.ts

### Implementation for User Story 1

- [x] T020 [US1] Implement album quotient algorithm in src/lib/server/algorithm/quotient.ts: detectAlbumRuns (walk scrobbles chronologically, group consecutive same-album ascending-position tracks), qualifyRuns (≥3 tracks standard, ≥2 short), weightTracks (1.0/0.9/0.5), calculateQuotient (weighted sum / total × 100), findTopAlbum (most tracks across qualifying runs)
- [x] T021 [US1] Implement POST /api/analyze server route in src/routes/api/analyze/+server.ts: validate username, call lastfm client getRecentTracks (3 pages), extract unique albums and call getAlbumInfo for each, run quotient algorithm, return AnalysisResult JSON, handle all error cases (400/404/422/502) per contracts/api-routes.md
- [x] T022 [US1] Create UsernameForm component in src/lib/components/UsernameForm.svelte: text input with submit button, username validation (1-100 chars, alphanumeric/hyphens/underscores), dispatches submit event with username, displays inline validation errors
- [x] T023 [P] [US1] Create LoadingState component in src/lib/components/LoadingState.svelte: loading indicator with "Analyzing your listening history..." message, accepts optional status text prop for progress updates
- [x] T024 [US1] Create ResultsView component in src/lib/components/ResultsView.svelte: accepts AnalysisResult prop, displays album quotient percentage as headline number, total albums as unit, top album name and artist, handles 0% quotient edge case with appropriate messaging
- [x] T025 [US1] Build main page state machine in src/routes/+page.svelte: three states (landing, loading, results), landing state shows UsernameForm, on submit calls POST /api/analyze via fetch, shows LoadingState during request, shows ResultsView on success, shows error message on failure with option to try again
- [x] T026 [US1] Create global layout with base styling in src/routes/+layout.svelte: imports app.css, renders slot with centered max-width container, sets base background and text colors

**Checkpoint**: At this point, User Story 1 should be fully functional — a user can enter a username, see loading, and view album quotient results. Tests pass.

---

## Phase 4: User Story 2 — Share Results (Priority: P2)

**Goal**: User can share their results via a unique URL; anyone with the URL sees the same results

**Independent Test**: Generate results for a username, click share, copy URL, open in incognito/new browser, verify same results display

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T027 [P] [US2] Write integration tests for POST /api/share in tests/integration/share.test.ts: test valid result persists and returns 201 with shareId and url, unique constraint enforced, null top_album for 0% quotient, nonexistent shareId returns empty
- [x] T028 [P] [US2] Write integration tests for /report/[shareId] load function — covered by E2E share flow test and integration/share.test.ts

### Implementation for User Story 2

- [x] T029 [US2] Implement POST /api/share server route in src/routes/api/share/+server.ts: validate all required fields from AnalysisResult, generate 12-char nanoid share_id, insert into analysis_results table via insertAnalysisResult query function, return 201 with shareId and url, log persistence with duration
- [x] T030 [US2] Create ShareButton component in src/lib/components/ShareButton.svelte: accepts AnalysisResult prop, on click calls POST /api/share, displays generated URL with copy-to-clipboard button, shows success feedback after copying
- [x] T031 [US2] Integrate ShareButton into ResultsView component in src/lib/components/ResultsView.svelte
- [x] T032 [US2] Create server load function in src/routes/report/[shareId]/+page.server.ts: query analysis_results by share_id via findByShareId query function, return parsed result with createdAt as ISO string, throw error(404) if not found, log query with duration
- [x] T033 [US2] Create shared results page in src/routes/report/[shareId]/+page.svelte: receives result from load function, reuses ResultsView component to display results identically to inline view, shows username and analysis date, includes link back to landing page
- [x] T034 [US2] Add error page handling for 404 on invalid share IDs (SvelteKit +error.svelte if not already present)

**Checkpoint**: User Stories 1 AND 2 are both independently functional. Users can analyze, share, and view shared results.

---

## Phase 5: User Story 3 — Visual Design and Polish (Priority: P3)

**Goal**: Cohesive visual identity with dark gray palette, gold/red accents, vinyl record imagery, smooth animations, and responsive layout

**Independent Test**: Load app on desktop (1920px) and mobile (375px) viewports, verify color palette, layout, typography, vinyl record, loading animation, and results visual hierarchy

### Implementation for User Story 3

- [x] T035 [US3] Define custom Tailwind v4 theme in src/app.css using @theme directive: medium-dark gray base (e.g., #2a2a2e), soft white/gray text levels (e.g., #e8e8e8, #b0b0b4, #808084), soft gold accent (e.g., #c9a84c), soft red accent (e.g., #c45c5c), custom font stack
- [x] T036 [US3] Create VinylRecord component in src/lib/components/VinylRecord.svelte: stylized CSS/SVG vinyl record with subtle spin animation on hover/idle, grooves and label detail, uses gold accent color for highlights
- [x] T037 [US3] Create LandingHero component in src/lib/components/LandingHero.svelte: "The Album Report" title with typographic hierarchy, VinylRecord below, explanatory paragraph text, wraps UsernameForm, responsive spacing
- [x] T038 [US3] Update src/routes/+page.svelte to use LandingHero in landing state instead of bare UsernameForm
- [x] T039 [US3] Add micro-interactions and transitions across all components: fade/slide transitions between page states (landing → loading → results), button hover/press animations on UsernameForm submit and ShareButton, score reveal animation on ResultsView (number counts up), use hardware-accelerated CSS (transform, opacity)
- [x] T040 [US3] Polish LoadingState component with themed animation: vinyl record spinning or stylized progress indicator in gold/red palette, smooth opacity transitions on mount/unmount
- [x] T041 [US3] Apply responsive design across all components: verify fluid layouts with rem/% units, add breakpoints for mobile (< 640px) and desktop, ensure touch targets ≥ 44x44px on mobile, test at 320px, 375px, 768px, 1024px, 1920px viewports

**Checkpoint**: All user stories are independently functional with cohesive visual design across all viewports.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, performance logging verification, Docker validation

- [x] T042 [P] Write E2E tests for full user flow in e2e/album-report.test.ts: 7 tests covering landing page, validation, loading state, full analyze+share+view flow, error states, 404 handling, responsive mobile viewport with touch target verification
- [x] T043 [P] Performance logging implemented via pino withPerformanceLog wrapper on all last.fm API calls, algorithm execution, and DB queries
- [x] T044 Docker Compose validated: Postgres container running on port 3031, migrations applied, app builds and serves on configured port
- [x] T045 Run quickstart.md validation: docker compose down -v, docker compose up --build, verified migrations auto-apply, app on :3030, analyze/share/report endpoints all functional, 404 for invalid share IDs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2), integrates with US1 components (ResultsView)
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2), refines US1 and US2 components
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational — integrates ShareButton into US1's ResultsView but is independently testable
- **User Story 3 (P3)**: Can start after Foundational — refines visual design of existing components from US1/US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types/models before services
- Services before API routes
- API routes before UI components
- Components before page integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T005, T007-T008)
- All Foundational tasks marked [P] can run in parallel (T010-T011, T014)
- Within US1: All test tasks (T017-T019) can run in parallel
- Within US1: LoadingState (T023) can run in parallel with other components
- Within US2: Both test tasks (T027-T028) can run in parallel
- Within US3: VinylRecord (T036) and LandingHero (T037) can start in parallel once theme is defined
- Polish tasks T042-T043 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit tests for album run detection in tests/unit/algorithm.test.ts"
Task: "Unit tests for last.fm client in tests/unit/lastfm-client.test.ts"
Task: "Integration tests for POST /api/analyze in tests/integration/analyze.test.ts"

# After tests fail, implement algorithm and API:
Task: "Album quotient algorithm in src/lib/server/algorithm/quotient.ts"
Task: "POST /api/analyze route in src/routes/api/analyze/+server.ts"

# Then build UI components (LoadingState can run in parallel):
Task: "UsernameForm in src/lib/components/UsernameForm.svelte"
Task: "LoadingState in src/lib/components/LoadingState.svelte"  # [P]
Task: "ResultsView in src/lib/components/ResultsView.svelte"

# Finally integrate:
Task: "Main page state machine in src/routes/+page.svelte"
Task: "Global layout in src/routes/+layout.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Enter a real last.fm username and verify the full flow works
5. Deploy/demo if ready — the core value proposition is complete

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (sharing works)
4. Add User Story 3 → Test independently → Deploy/Demo (polished)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The last.fm API client (T015) is the most critical foundational piece — it unblocks all of US1
- Album info fetching is the performance bottleneck (~1 req/sec per unique album) — consider in-memory caching from the start
