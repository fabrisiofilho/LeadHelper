-- Migration 002: Tabela de histórico de atualizações de tasks
-- Armazena o histórico de alterações de campos dos work items do Azure DevOps

CREATE TABLE IF NOT EXISTS task_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    external_work_item_id INTEGER NOT NULL,
    revision INTEGER NOT NULL,
    changed_date DATETIME NOT NULL,
    changed_by TEXT,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_external_work_item_id ON task_updates(external_work_item_id);

-- Registrar migração
INSERT INTO migrations (name) VALUES ('002_task_updates');
