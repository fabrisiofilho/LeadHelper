-- Migration 007: Add Azure DevOps enrichment columns to tasks
-- Preserves additional fields from Azure DevOps work items during import and sync

ALTER TABLE tasks ADD COLUMN area_path TEXT;
ALTER TABLE tasks ADD COLUMN iteration_path TEXT;
ALTER TABLE tasks ADD COLUMN tags TEXT;
ALTER TABLE tasks ADD COLUMN story_points REAL;
ALTER TABLE tasks ADD COLUMN original_work_item_type TEXT;
