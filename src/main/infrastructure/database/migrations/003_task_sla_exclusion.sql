-- Migration 003: Task SLA Exclusion, Hidden Items, and Azure Created Date

-- SLA exclusion: allows users to exclude specific Tickets from SLA tracking
CREATE TABLE IF NOT EXISTS task_sla_exclusion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_sla_exclusion_external_id ON task_sla_exclusion(external_id);

-- Hidden items: allows users to hide irrelevant work items from the dashboard
CREATE TABLE IF NOT EXISTS task_hidden (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_hidden_external_id ON task_hidden(external_id);
