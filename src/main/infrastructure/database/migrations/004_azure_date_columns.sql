-- Migration 004: Add Azure date columns to tasks table

-- Azure created date: stores the original creation date from Azure DevOps
ALTER TABLE tasks ADD COLUMN azure_created_date DATETIME;

-- Azure changed date: stores the last update date from Azure DevOps
ALTER TABLE tasks ADD COLUMN azure_changed_date DATETIME;

-- Azure raw priority: stores the original numeric priority from Azure DevOps (1-4)
ALTER TABLE tasks ADD COLUMN azure_priority INTEGER;
