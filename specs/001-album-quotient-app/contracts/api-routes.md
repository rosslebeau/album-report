# API Route Contracts: Album Quotient App

**Branch**: `001-album-quotient-app` | **Date**: 2026-03-14

All routes are SvelteKit server routes. No separate backend.

---

## POST /api/analyze

Accepts a last.fm username, fetches scrobbles, runs the album
quotient algorithm, and returns the analysis result.

**Request**:
```json
{
  "username": "string (1-100 chars, required)"
}
```

**Response 200**:
```json
{
  "username": "rj",
  "albumQuotient": 42.5,
  "totalAlbumsAsUnit": 7,
  "topAlbum": {
    "name": "OK Computer",
    "artist": "Radiohead"
  },
  "totalScrobbles": 600,
  "albumRuns": [
    {
      "albumName": "OK Computer",
      "artistName": "Radiohead",
      "trackCount": 8,
      "albumTrackCount": 12,
      "startedFromTrack1": true,
      "startPosition": 1,
      "isShortAlbum": false,
      "weight": 1.0
    }
  ]
}
```

**Response 400** (validation error):
```json
{
  "error": "INVALID_USERNAME",
  "message": "Username must be 1-100 alphanumeric characters."
}
```

**Response 404** (user not found):
```json
{
  "error": "USER_NOT_FOUND",
  "message": "No last.fm user found with username 'xyz'."
}
```

**Response 422** (no scrobbles):
```json
{
  "error": "NO_SCROBBLES",
  "message": "User 'xyz' has no scrobble history."
}
```

**Response 502** (last.fm API failure):
```json
{
  "error": "UPSTREAM_ERROR",
  "message": "Unable to reach last.fm. Please try again later."
}
```

---

## POST /api/share

Persists an analysis result and returns a share URL.

**Request**:
```json
{
  "username": "string (required)",
  "albumQuotient": "number (required)",
  "totalAlbumsAsUnit": "number (required)",
  "topAlbum": {
    "name": "string | null",
    "artist": "string | null"
  },
  "totalScrobbles": "number (required)",
  "albumRuns": "AlbumRun[] (required)"
}
```

**Response 201**:
```json
{
  "shareId": "a1b2c3d4e5f6",
  "url": "/report/a1b2c3d4e5f6"
}
```

**Response 400** (validation error):
```json
{
  "error": "INVALID_RESULT",
  "message": "Missing required fields in analysis result."
}
```

---

## GET /report/[shareId] (Server Load Function)

This is not a standalone API route — it is a SvelteKit page with
a `+page.server.ts` load function that fetches the persisted
result from Postgres and passes it to the page component.

**URL pattern**: `/report/{shareId}` where `shareId` is a 12-char
alphanumeric string.

**Load function returns**:
```typescript
{
  result: {
    username: string;
    albumQuotient: number;
    totalAlbumsAsUnit: number;
    topAlbum: { name: string; artist: string } | null;
    totalScrobbles: number;
    albumRuns: AlbumRun[];
    createdAt: string; // ISO 8601
  }
}
```

**Error (404)**: If `shareId` does not match any persisted result,
the load function throws a SvelteKit `error(404)` which renders
the app's error page.

---

## Error Code Reference

| Code             | HTTP | When                                |
|------------------|------|-------------------------------------|
| INVALID_USERNAME | 400  | Username fails validation           |
| USER_NOT_FOUND   | 404  | last.fm returns user-not-found      |
| NO_SCROBBLES     | 422  | User exists but has 0 scrobbles     |
| UPSTREAM_ERROR   | 502  | last.fm API unreachable/rate-limited |
| INVALID_RESULT   | 400  | Share request missing required data |
