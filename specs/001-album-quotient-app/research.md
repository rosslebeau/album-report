# Research: Album Quotient App

**Branch**: `001-album-quotient-app` | **Date**: 2026-03-14

## R1: Architecture — Separate Backend?

**Decision**: No separate backend server. SvelteKit handles all
server-side logic.

**Rationale**: SvelteKit is a full-stack framework. Server routes
(`+server.ts`) and server load functions (`+page.server.ts`) handle
database access, external API calls, and business logic. The last.fm
API key stays server-side via `$env/static/private`. All requirements
(API proxy, algorithm, persistence, SSR) are covered without a second
service.

**Alternatives considered**:
- Separate Express/Fastify API server: adds operational complexity
  (second container, inter-service networking, CORS) with no benefit
  for this workload.
- Serverless functions: unnecessary for a Docker Compose deployment.

## R2: last.fm API

**Decision**: Use `user.getRecentTracks` and `album.getInfo` endpoints
with API key authentication.

**Rationale**: These two endpoints provide everything needed — scrobble
history with timestamps and album track listings with track numbers.

**Key findings**:
- Base URL: `https://ws.audioscrobbler.com/2.0/`
- Auth: API key only (no OAuth needed for read operations)
- `user.getRecentTracks`: returns artist, album (`album["#text"]`),
  track name, timestamp (`date.uts`). Max 200 per page (officially).
  Paginate with `page` param. Currently-playing track has no `date`
  field and `@attr.nowplaying = "true"` — must be filtered out.
- `album.getInfo`: returns ordered tracklist with track position at
  `track["@attr"]["rank"]`. Single-track albums may return an object
  instead of array — must normalize defensively.
- No published rate limit, but community consensus is ~1 req/sec
  sustained. Must set an identifiable User-Agent header.
- Error responses return HTTP 200 with `{"error": N, "message": "..."}`.

**Implications for performance**:
- Fetching 600 scrobbles: 3 requests at limit=200 (~3 seconds)
- Fetching album info for unique albums: ~1 req/sec per album.
  With 20 unique albums, ~20 seconds. Server-side caching of album
  track listings is critical for acceptable performance.

## R3: Database Layer

**Decision**: Lightweight custom DB layer using raw `pg` client.

**Rationale**: A single-table schema with straightforward CRUD
operations does not justify an ORM. A custom layer using `pg`
directly keeps dependencies minimal, gives full control over
queries, and can be extended as-needed without framework overhead.
TypeScript interfaces provide type safety for query results via
explicit row-to-type mapping functions.

**Alternatives considered**:
- Drizzle ORM: lightweight for an ORM, but still an unnecessary
  abstraction for a single table with simple queries. Adds
  drizzle-orm + drizzle-kit dependencies and a schema DSL to learn.
- Prisma: heavier (~15MB engine binary), requires codegen step,
  massively overkill for this use case.

**Setup**: `pg` + `@types/pg` only. Migrations managed via raw SQL
files executed on app startup. The DB layer exposes typed query
functions (e.g., `insertAnalysisResult`, `findByShareId`) that
encapsulate SQL and handle row-to-type conversion.

## R4: Tailwind CSS v4

**Decision**: Tailwind v4 via `@tailwindcss/vite` plugin.

**Rationale**: v4 uses a native Vite plugin instead of PostCSS.
No `tailwind.config.js` — theme customization is done via CSS
`@theme` directives. Auto-detects source files. Simpler setup.

## R5: Testing Stack

**Decision**: Vitest for unit/integration tests, Playwright for E2E.

**Rationale**: Vitest shares the Vite config, zero extra bundler
setup. Playwright is the SvelteKit-recommended E2E framework.
`@testing-library/svelte` for component tests.

## R6: Docker Base Image

**Decision**: `node:22-slim` with multi-stage build.

**Rationale**: Node 22 is active LTS through April 2027. `-slim`
over Alpine to avoid musl libc issues with `pg` native bindings.
Multi-stage build keeps the final image small (no devDependencies,
no source code).

## R7: Album Quotient Algorithm Design

**Decision**: Sliding-window album run detection with qualification
thresholds and short-album weighting.

**Algorithm**:

1. **Fetch scrobbles**: 600 most recent via paginated
   `user.getRecentTracks` calls. Filter out currently-playing
   (no timestamp). Sort chronologically (oldest first).

2. **Identify unique albums**: Collect distinct (artist, album)
   pairs from scrobbles.

3. **Fetch track listings**: For each unique album, call
   `album.getInfo` to get the ordered tracklist. Cache results
   server-side. Albums with no tracklist data: all their tracks
   default to "one-off."

4. **Detect album runs**: Walk through scrobbles chronologically.
   A "run" is a maximal sequence of consecutive scrobbles where:
   - All tracks are from the same album (artist + album name match)
   - Each track's position on the album tracklist is strictly
     greater than the previous track's position (ascending order,
     gaps allowed — e.g., tracks 1, 2, 4, 5 is one run)
   - A single-track sequence does not qualify as a run

5. **Qualify runs**:
   - Standard album (5+ tracks): run qualifies if it contains
     ≥ 3 tracks
   - Short album (1-4 tracks): run qualifies if it contains
     ≥ 2 tracks

6. **Weight tracks**: Each track in a qualifying run gets a weight:
   - Standard album, run started from track 1: weight = 1.0
   - Standard album, run started mid-album: weight = 0.9
   - Short album (any start position): weight = 0.5
   - Non-qualifying tracks: weight = 0.0

7. **Calculate outputs**:
   - `albumQuotient` = (sum of all track weights / total scrobbles
     analyzed) × 100, capped at 100
   - `totalAlbumsAsUnit` = count of qualifying runs
   - `topAlbum` = the album with the most total tracks across all
     its qualifying runs

**Rationale**: This design rewards sequential album listening while
being forgiving of skipped tracks. The short-album penalty prevents
2-track EPs from inflating the quotient. The track-1 bonus subtly
rewards "proper" album starts without penalizing mid-album listeners
significantly.
