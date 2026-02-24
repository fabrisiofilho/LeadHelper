-- Migration 005: Add assignee_id to tasks
-- Allows assigning a team member as the responsible person for a task

ALTER TABLE tasks ADD COLUMN assignee_id INTEGER REFERENCES team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
