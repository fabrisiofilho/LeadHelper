-- Migration 008: Add Azure Area Path column to teams
-- Allows mapping a team to an Azure DevOps Area Path for automatic task association during import/sync

ALTER TABLE teams ADD COLUMN azure_area_path TEXT;

CREATE INDEX IF NOT EXISTS idx_teams_azure_area_path ON teams(azure_area_path);
