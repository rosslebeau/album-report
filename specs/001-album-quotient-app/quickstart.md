# Quickstart: Album Quotient App

**Branch**: `001-album-quotient-app` | **Date**: 2026-03-14

## Prerequisites

- Docker and Docker Compose installed
- A last.fm API key (create one at https://www.last.fm/api/account/create)

## Setup

1. Clone the repository and check out the feature branch:

   ```bash
   git clone <repo-url>
   cd album-report
   git checkout 001-album-quotient-app
   ```

2. Create a `.env` file in the project root:

   ```env
   LASTFM_API_KEY=your_api_key_here
   DATABASE_URL=postgresql://albumreport:albumreport@db:5432/albumreport
   POSTGRES_USER=albumreport
   POSTGRES_PASSWORD=albumreport
   POSTGRES_DB=albumreport
   ```

3. Start the app:

   ```bash
   docker compose up
   ```

   This starts:
   - **SvelteKit app** at `http://localhost:3030`
   - **PostgreSQL** at `localhost:3031`

4. The database migrations run automatically on app startup.

## Development

For local development outside Docker:

```bash
npm install
npm run migrate            # Apply SQL migrations to local Postgres
npm run dev                 # Start SvelteKit dev server
```

## Testing

```bash
npm run test                # Unit + integration tests (Vitest)
npm run test:e2e            # E2E tests (Playwright)
```

## Usage

1. Open `http://localhost:3030` in your browser.
2. Enter a last.fm username in the text field.
3. Wait for the analysis to complete (loading indicator shown).
4. View your album quotient, total albums as a unit, and top album.
5. Click "Share" to get a URL you can send to friends.

## Ports

Ports are configurable in `docker-compose.yml`:

| Service   | Default Port | Environment Variable |
|-----------|-------------|----------------------|
| SvelteKit | 3030        | `APP_PORT`           |
| PostgreSQL| 3031        | `DB_PORT`            |
