-- Migration 007: Notes Board - Note Cards e Note Links

CREATE TABLE IF NOT EXISTS note_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    deadline DATE,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS note_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_card_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('team_member', 'team', 'position', 'task')),
    entity_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_card_id) REFERENCES note_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_links_note_card_id ON note_links(note_card_id);
CREATE INDEX IF NOT EXISTS idx_note_links_entity ON note_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_note_cards_completed_at ON note_cards(completed_at);

-- Registrar migração
INSERT INTO migrations (name) VALUES ('007_note_cards');
