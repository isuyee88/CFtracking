ALTER TABLE clicks ADD COLUMN governanceAction TEXT;

CREATE INDEX IF NOT EXISTS idx_clicks_governanceAction ON clicks(governanceAction);
