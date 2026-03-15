CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id VARCHAR(12) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    album_quotient NUMERIC(5, 2) NOT NULL,
    total_albums_as_unit INTEGER NOT NULL,
    top_album_name VARCHAR(500),
    top_album_artist VARCHAR(500),
    total_scrobbles INTEGER NOT NULL,
    album_runs JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_share_id ON analysis_results (share_id);
