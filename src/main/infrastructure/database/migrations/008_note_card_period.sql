-- Migration 008: Note Card Period Support
-- Adds start_date and all_day fields to note_cards for allocation/period tracking.
-- start_date: when set, the note has a period (start_date → deadline).
--             When start_date = deadline date, it is a single-day event.
--             When null, the note is a plain note (no timeline entry).
-- all_day: when true (default), times are ignored and only dates are shown.
--          when false, start_date and deadline include time information.

ALTER TABLE note_cards ADD COLUMN start_date DATETIME;
ALTER TABLE note_cards ADD COLUMN all_day INTEGER NOT NULL DEFAULT 1;

-- Index for Gantt queries (filter notes with a period)
CREATE INDEX IF NOT EXISTS idx_note_cards_start_date ON note_cards(start_date);

INSERT INTO migrations (name) VALUES ('008_note_card_period');
