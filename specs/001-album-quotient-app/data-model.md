# Data Model: Album Quotient App

**Branch**: `001-album-quotient-app` | **Date**: 2026-03-14

## Entities

### AnalysisResult (persisted)

The primary database entity. Stores a snapshot of a completed album
quotient analysis for sharing.

| Field              | Type         | Constraints                    |
|--------------------|--------------|--------------------------------|
| id                 | UUID         | Primary key, auto-generated    |
| share_id           | VARCHAR(12)  | Unique, not null, indexed      |
| username           | VARCHAR(100) | Not null                       |
| album_quotient     | NUMERIC(5,2) | Not null, range 0.00-100.00    |
| total_albums_as_unit | INTEGER    | Not null, >= 0                 |
| top_album_name     | VARCHAR(500) | Nullable (0% quotient case)    |
| top_album_artist   | VARCHAR(500) | Nullable (0% quotient case)    |
| total_scrobbles    | INTEGER      | Not null, > 0                  |
| album_runs         | JSONB        | Not null, detailed run data    |
| created_at         | TIMESTAMPTZ  | Not null, default now()        |

**Notes**:
- `share_id` is a short, URL-safe string (e.g., nanoid) used in
  share URLs: `/report/{share_id}`
- `album_runs` stores the full breakdown as JSONB for the results
  display — avoids needing to re-derive from raw data
- No update operations — results are immutable snapshots
- No foreign keys — single-table schema

### AlbumRun (embedded in JSONB)

Stored within `analysis_results.album_runs` as an array of objects.
Not a separate table.

| Field              | Type    | Description                        |
|--------------------|---------|------------------------------------|
| albumName          | string  | Album title                        |
| artistName         | string  | Artist name                        |
| trackCount         | number  | Tracks in this run                 |
| albumTrackCount    | number  | Total tracks on the album          |
| startedFromTrack1  | boolean | Whether run began at track 1       |
| startPosition      | number  | Track number where run started     |
| isShortAlbum       | boolean | Album has 1-4 tracks               |
| weight             | number  | Per-track weight applied (0.5-1.0) |

### Scrobble (transient — not persisted)

Fetched from last.fm API, used only during analysis. Never stored
in the database.

| Field     | Type   | Source                         |
|-----------|--------|--------------------------------|
| track     | string | `track.name`                   |
| artist    | string | `track.artist.name`            |
| album     | string | `track.album["#text"]`         |
| timestamp | number | `track.date.uts` (UNIX epoch)  |
| albumMbid | string | `track.album.mbid` (optional)  |

### AlbumInfo (transient — cached in memory)

Fetched from last.fm `album.getInfo`, cached server-side during
a single analysis run. Not persisted to database.

| Field      | Type     | Source                           |
|------------|----------|----------------------------------|
| name       | string   | `album.name`                     |
| artist     | string   | `album.artist`                   |
| trackCount | number   | `album.tracks.track.length`      |
| tracks     | Track[]  | Ordered list of tracks           |

Where `Track` is:

| Field    | Type   | Source                          |
|----------|--------|---------------------------------|
| name     | string | `track.name`                    |
| position | number | `track["@attr"]["rank"]` (int)  |

## Relationships

```
Scrobble (transient, from API)
    ↓ grouped by (artist, album)
AlbumInfo (transient, from API, cached)
    ↓ algorithm processes scrobbles + album info
AlbumRun (transient, computed)
    ↓ aggregated into
AnalysisResult (persisted to Postgres)
    ↓ referenced by
ShareLink (share_id field on AnalysisResult)
```

## State Transitions

AnalysisResult has no state transitions — it is created once and
never modified. It may eventually be deleted by a cleanup process
if storage limits are reached (out of scope for initial
implementation).

## Validation Rules

- `username`: 1-100 characters, alphanumeric plus hyphens and
  underscores (matches last.fm username rules)
- `share_id`: exactly 12 URL-safe characters (alphanumeric)
- `album_quotient`: 0.00 to 100.00 inclusive
- `total_albums_as_unit`: non-negative integer
- `total_scrobbles`: positive integer (at least 1 scrobble
  must exist to produce a result)
