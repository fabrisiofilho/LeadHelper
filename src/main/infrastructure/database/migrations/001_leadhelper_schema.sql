-- Migration: 001_leadhelper_schema
-- Description: LeadHelper - Team Management System database schema
-- Created: 2026-02-24

-- ============================================
-- TABLE: migrations
-- Description: Tracks applied migrations
-- ============================================
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: users
-- Description: Stores user information with secure password storage
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================
-- TABLE: positions (Cargos)
-- Description: Stores job positions/roles that can be assigned to team members
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_name ON positions(name);
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);

-- ============================================
-- TABLE: teams (Equipes)
-- Description: Stores teams that members can be allocated to
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#2196F3',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

-- ============================================
-- TABLE: team_members
-- Description: Stores team member information (developers, analysts, QA, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('developer', 'analyst', 'qa', 'tech_lead', 'devops', 'designer', 'product_owner')),
    position_id INTEGER,
    capacity_hours_per_day REAL DEFAULT 8,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_position_id ON team_members(position_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON team_members(is_active);

-- ============================================
-- TABLE: team_member_teams (Many-to-Many relationship)
-- Description: Links team members to teams
-- ============================================
CREATE TABLE IF NOT EXISTS team_member_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_member_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(team_member_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_member_teams_member ON team_member_teams(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_teams_team ON team_member_teams(team_id);

-- ============================================
-- TABLE: team_member_allocations
-- Description: Stores temporal allocation of team members to teams with dedication percentage
-- ============================================
CREATE TABLE IF NOT EXISTS team_member_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_member_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    dedication_percentage INTEGER DEFAULT 100 CHECK(dedication_percentage >= 1 AND dedication_percentage <= 100),
    notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE RESTRICT,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_team_member_allocations_team_member_id ON team_member_allocations(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_allocations_team_id ON team_member_allocations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_allocations_start_date ON team_member_allocations(start_date);
CREATE INDEX IF NOT EXISTS idx_team_member_allocations_end_date ON team_member_allocations(end_date);
CREATE INDEX IF NOT EXISTS idx_team_member_allocations_is_active ON team_member_allocations(is_active);

-- ============================================
-- TABLE: sprints
-- Description: Stores sprint information for task scheduling
-- ============================================
CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    team_id INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sprints_name ON sprints(name);
CREATE INDEX IF NOT EXISTS idx_sprints_team_id ON sprints(team_id);
CREATE INDEX IF NOT EXISTS idx_sprints_start_date ON sprints(start_date);
CREATE INDEX IF NOT EXISTS idx_sprints_end_date ON sprints(end_date);
CREATE INDEX IF NOT EXISTS idx_sprints_is_active ON sprints(is_active);

-- ============================================
-- TABLE: tasks
-- Description: Stores tasks/demands that can be assigned to team members
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
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

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_origin ON tasks(origin);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(external_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);

-- ============================================
-- TABLE: allocations
-- Description: Stores allocations linking team members to tasks with specific periods
-- ============================================
CREATE TABLE IF NOT EXISTS allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_member_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE RESTRICT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_allocations_team_member_id ON allocations(team_member_id);
CREATE INDEX IF NOT EXISTS idx_allocations_task_id ON allocations(task_id);
CREATE INDEX IF NOT EXISTS idx_allocations_start_date ON allocations(start_date);
CREATE INDEX IF NOT EXISTS idx_allocations_end_date ON allocations(end_date);

-- ============================================
-- TABLE: azure_devops_config
-- Description: Stores Azure DevOps integration configuration
-- ============================================
CREATE TABLE IF NOT EXISTS azure_devops_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_url TEXT NOT NULL,
    project_name TEXT NOT NULL,
    pat_encrypted TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Insert default positions
-- ============================================
INSERT OR IGNORE INTO positions (name, description) VALUES 
    ('Desenvolvedor', 'Desenvolvedor de software'),
    ('Analista', 'Analista de sistemas'),
    ('QA', 'Quality Assurance / Tester'),
    ('Tech Lead', 'Líder técnico'),
    ('DevOps', 'Engenheiro DevOps'),
    ('Designer', 'Designer UI/UX'),
    ('Product Owner', 'Product Owner / Gerente de Produto'),
    ('Scrum Master', 'Scrum Master'),
    ('Arquiteto', 'Arquiteto de Software');
