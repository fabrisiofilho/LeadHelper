-- Migration 012: Add blocked/impedimento fields to tasks
-- is_blocked: boolean (0/1) — mirrors Custom.Impedimento from Azure DevOps
-- blocked_reason: text     — mirrors Custom.MotivoImpedimento from Azure DevOps

ALTER TABLE tasks ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN blocked_reason TEXT;

INSERT INTO migrations (name) VALUES ('012_task_blocked');
