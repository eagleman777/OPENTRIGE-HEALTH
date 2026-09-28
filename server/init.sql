CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS triage_reports (
    id SERIAL PRIMARY KEY,
    patient_hash VARCHAR(64) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    diagnosis VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_triage_reports_geom ON triage_reports USING GIST (geom);