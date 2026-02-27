-- Migration: Add task hierarchy (parent/child) and position integration
-- Date: 2024-02-27

-- Add parent_id column to tasks table for hierarchy support
ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

-- Add work_item_relations column to store Azure DevOps relations as JSON
ALTER TABLE tasks ADD COLUMN work_item_relations TEXT;

-- Create index for parent_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- Create index for position_id in team_members (if not exists)
CREATE INDEX IF NOT EXISTS idx_team_members_position_id ON team_members(position_id);

-- Note: position_id column already exists in team_members table from initial schema
-- This migration only adds the index for better performance
