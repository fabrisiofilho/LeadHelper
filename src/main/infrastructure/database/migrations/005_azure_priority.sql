-- Migration 005: Add Azure raw priority column
ALTER TABLE tasks ADD COLUMN azure_priority INTEGER;
