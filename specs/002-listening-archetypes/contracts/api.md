# API Contracts: Listening Archetypes

**Feature**: 002-listening-archetypes
**Date**: 2026-03-15

## Modified Endpoints

### POST /api/analyze

No input changes. Response body extended.

**Response** (200 OK):

```jsonc
{
  "username": "string",
  "albumQuotient": 42.50,
  "totalAlbumsAsUnit": 5,
  "topAlbum": { "name": "string", "artist": "string" } | null,
  "totalScrobbles": 600,
  "albumRuns": [ /* existing AlbumRun[] */ ],

  // NEW FIELD
  "archetypeResult": {
    "archetype": "Completionist",                       // ArchetypeName
    "confidence": 0.82,                                 // 0.0–1.0
    "confidenceLevel": "high",                          // "high" | "medium" | "low"
    "description": "You listen to full albums across multiple different artists. When you put on a record, you hear it through.",
    "secondaryArchetype": "Deep Diver" | null,          // ArchetypeName | null
    "secondaryDescription": "You also show signs of binging specific artists' catalogs." | null,
    "metrics": {
      "albumCompletionRate": 0.72,
      "artistConcentration": 0.14,
      "albumBreadth": 0.08,
      "trackPositionSkew": 0.48,
      "repeatIntensityAlbum": 0.35,
      "repeatIntensityTrack": 0.42,
      "scrobbleEntropy": 0.78,
      "popularitySkew": null,                           // null when unavailable
      "genreCoherence": null,                           // null when unavailable
      "uniqueAlbums": 48,
      "uniqueArtists": 22,
      "totalScrobbles": 600,
      "qualifyingAlbums": 32
    },
    "interestingStats": [
      {
        "label": "Albums completed",
        "value": "8 out of 14",
        "detail": "Albums where you heard 80% or more of the tracks"
      },
      {
        "label": "Top artist",
        "value": "Radiohead (18%)",
        "detail": null
      }
    ],
    "archetypeScores": {
      "Ritualist": 0.12,
      "Deep Diver": 0.74,
      "Completionist": 0.82,
      "Side A Loyalist": 0.21,
      "Cherry Picker": 0.08,
      "Shuffle Gremlin": 0.15
    },
    "disabledArchetypes": ["Singles Hound", "Curator"]  // Excluded due to missing data
  }
}
```

**Error responses**: Unchanged from existing contract.

### POST /api/share

**Request body** extended with optional archetype field:

```jsonc
{
  "username": "string",
  "albumQuotient": 42.50,
  "totalAlbumsAsUnit": 5,
  "topAlbum": { "name": "string", "artist": "string" } | null,
  "totalScrobbles": 600,
  "albumRuns": [ /* AlbumRun[] */ ],

  // NEW FIELD (validated as optional)
  "archetypeResult": { /* ArchetypeResult */ } | null
}
```

**Response**: Unchanged (`{ shareId, url }`).

**Validation**: The `archetypeResult` field is accepted as-is if present and non-null. The share endpoint validates structural shape (required fields exist and have correct types) but does not re-validate metric values or classification correctness.

### GET /report/[shareId]

**Server load data** extended:

```jsonc
{
  "id": "uuid",
  "shareId": "string",
  "username": "string",
  "albumQuotient": 42.50,
  "totalAlbumsAsUnit": 5,
  "topAlbum": { "name": "string", "artist": "string" } | null,
  "totalScrobbles": 600,
  "albumRuns": [ /* AlbumRun[] */ ],
  "createdAt": "2026-03-15T10:30:00Z",

  // NEW FIELD (null for reports created before this feature)
  "archetypeResult": { /* ArchetypeResult */ } | null
}
```

**Backward compatibility**: Old reports have `archetypeResult: null`. The frontend renders the report without the archetype section when this field is null.
