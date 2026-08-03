-- Migration 009: Add date_mode column to note_cards
-- Stores the explicit date mode chosen by the user:
--   'none'   = no date configured
--   'single' = single date (startDate = deadline or only one set)
--   'period' = date range (startDate < deadline)
-- Backfills existing rows based on current data.

ALTER TABLE note_cards ADD COLUMN date_mode TEXT NOT NULL DEFAULT 'none';

-- Backfill: rows with start_date AND deadline → period
UPDATE note_cards
SET date_mode = 'period'
WHERE start_date IS NOT NULL AND deadline IS NOT NULL;

-- Backfill: rows with only one date set → single
UPDATE note_cards
SET date_mode = 'single'
WHERE (start_date IS NOT NULL AND deadline IS NULL)
   OR (start_date IS NULL AND deadline IS NOT NULL);

INSERT INTO migrations (name) VALUES ('009_note_card_date_mode');
