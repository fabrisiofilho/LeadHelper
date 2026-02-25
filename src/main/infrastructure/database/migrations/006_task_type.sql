-- Migration 006: Add type column to tasks
-- Allows categorizing tasks as Feature, Bug, Improvement, etc.

ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'task';
