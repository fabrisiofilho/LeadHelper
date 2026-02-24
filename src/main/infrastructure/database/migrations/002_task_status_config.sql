-- ============================================
-- Migration: 002_task_status_config
-- Description: Tabela de status configuráveis para o Kanban
--              Remove CHECK constraint do campo status da tabela tasks
-- ============================================

-- 1. Criar tabela de configuração de status
CREATE TABLE IF NOT EXISTS task_status_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#9e9e9e',
    "order" INTEGER NOT NULL DEFAULT 0,
    show_in_kanban INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inserir status padrão
INSERT OR IGNORE INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('pending', 'Pendente', '#9e9e9e', 0, 1, 1),
    ('in_progress', 'Em Andamento', '#1976d2', 1, 1, 0),
    ('completed', 'Concluída', '#2e7d32', 2, 1, 0),
    ('cancelled', 'Cancelada', '#d32f2f', 3, 0, 0);

-- 3. Recriar tabela tasks sem CHECK constraint no campo status
CREATE TABLE IF NOT EXISTS tasks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    origin TEXT DEFAULT 'manual' CHECK(origin IN ('manual', 'azure_devops')),
    external_id TEXT,
    external_source TEXT,
    sprint_id INTEGER,
    team_id INTEGER,
    estimation_points REAL,
    estimation_hours REAL,
    estimation_type TEXT CHECK(estimation_type IN ('points', 'hours') OR estimation_type IS NULL),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

INSERT INTO tasks_new SELECT * FROM tasks;

DROP TABLE tasks;

ALTER TABLE tasks_new RENAME TO tasks;

-- 4. Recriar índices
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_origin ON tasks(origin);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(external_id);
