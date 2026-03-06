-- Migration 001: LeadHelper - Schema Consolidado
-- Consolida todas as migrações anteriores
-- Tabelas removidas: allocations, task_status_config, team_member_teams
-- Colunas removidas de tasks: estimation_points, estimation_hours, estimation_type, external_source, assignee_id, type (local)
-- Colunas removidas de team_member_allocations: dedication_percentage
-- NOTA: O campo 'type' agora armazena diretamente o tipo do Azure DevOps (Epic, Feature, User Story, Task, Bug, etc.)

-- ============================================================
-- Tabela de controle de migrações
-- ============================================================
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Cargos (positions)
-- ============================================================
CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dados padrão de cargos
INSERT INTO positions (name, description, is_active) VALUES
    ('Desenvolvedor', 'Desenvolvedor de software', 1),
    ('Tech Lead', 'Líder técnico', 1),
    ('QA', 'Analista de qualidade', 1),
    ('Scrum Master', 'Scrum Master', 1),
    ('Product Owner', 'Product Owner', 1),
    ('Designer', 'Designer de interface', 1),
    ('DevOps', 'Engenheiro DevOps', 1),
    ('Analista', 'Analista de sistemas', 1);

-- ============================================================
-- Usuários (users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Equipes (teams)
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    color TEXT,
    azure_area_path TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Membros de equipe (team_members)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    capacity_hours_per_day REAL DEFAULT 8,
    position_id INTEGER,
    azure_unique_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES positions(id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_azure_unique_id ON team_members(azure_unique_id);

-- ============================================================
-- Alocações de membros em equipes (team_member_allocations)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_member_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_member_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- ============================================================
-- Sprints
-- ============================================================
CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    team_id INTEGER,
    iteration_path TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_sprints_iteration_path ON sprints(iteration_path);

-- ============================================================
-- Tarefas (tasks)
-- O campo 'type' armazena o tipo original do Azure DevOps (Epic, Feature, User Story, Task, Bug, etc.)
-- Não há mapeamento local - usamos os mesmos nomes do Azure DevOps
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    type TEXT DEFAULT 'Task',
    origin TEXT DEFAULT 'manual',
    external_id TEXT,
    area_path TEXT,
    iteration_path TEXT,
    tags TEXT,
    story_points REAL,
    assigned_to_name TEXT,
    assigned_to_email TEXT,
    sprint_id INTEGER,
    team_id INTEGER,
    parent_id INTEGER,
    work_item_relations TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- ============================================================
-- Comentários de tarefas (task_comments)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    author TEXT,
    task_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================
-- Prioridade local de tarefas (task_local_priority)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_local_priority (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL UNIQUE,
    local_priority INTEGER NOT NULL DEFAULT 0 CHECK (local_priority >= 0 AND local_priority <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_local_priority_external_id ON task_local_priority(external_id);

-- ============================================================
-- Posição local no Kanban (task_local_kanban)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_local_kanban (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL UNIQUE,
    local_column TEXT NOT NULL,
    local_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_local_kanban_external_id ON task_local_kanban(external_id);

-- ============================================================
-- Configuração do Azure DevOps
-- ============================================================
CREATE TABLE IF NOT EXISTS azure_devops_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_url TEXT NOT NULL,
    project_name TEXT NOT NULL,
    pat_encrypted TEXT NOT NULL,
    sustentacao_area_path TEXT,
    projetos_area_path TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Registrar migração
INSERT INTO migrations (name) VALUES ('001_leadhelper_schema');
