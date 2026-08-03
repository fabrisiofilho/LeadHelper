-- Migration 010: Add performance indexes on tasks table
-- Speeds up the area_path LIKE queries, sprint/parent lookups, and email lookups

CREATE INDEX IF NOT EXISTS idx_tasks_area_path
  ON tasks (area_path);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_email
  ON tasks (assigned_to_email);

CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id
  ON tasks (sprint_id);

CREATE INDEX IF NOT EXISTS idx_tasks_parent_id
  ON tasks (parent_id);

CREATE INDEX IF NOT EXISTS idx_tasks_external_id
  ON tasks (external_id);

CREATE INDEX IF NOT EXISTS idx_tasks_type_status
  ON tasks (type, status);

CREATE INDEX IF NOT EXISTS idx_tasks_azure_config_id
  ON tasks (azure_devops_config_id);
