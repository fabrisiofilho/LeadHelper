-- Migration 006: Add allowed_statuses column to positions table
-- Stores comma-separated list of statuses that are valid for this position

ALTER TABLE positions ADD COLUMN allowed_statuses TEXT;
