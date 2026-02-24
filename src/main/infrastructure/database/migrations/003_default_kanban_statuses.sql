-- ============================================
-- Migration: 003_default_kanban_statuses
-- Description: Adiciona status padrão de Kanban de desenvolvimento de software
-- ============================================

-- Limpar status anteriores para substituir pelo fluxo completo
DELETE FROM task_status_config;

-- Inserir status padrão de mercado para desenvolvimento de software
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('backlog',         'Backlog',           '#78909c', 0,  1, 1);
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('to_do',           'A Fazer',           '#5c6bc0', 1,  1, 0);
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('in_progress',     'Em Andamento',      '#1976d2', 2,  1, 0);
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('code_review',     'Code Review',       '#7b1fa2', 3,  1, 0);
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('testing',         'Em Teste',          '#f57c00', 4,  1, 0);
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('done',            'Concluído',         '#2e7d32', 5,  1, 0);
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('blocked',         'Bloqueado',         '#d32f2f', 6,  0, 0);
INSERT INTO task_status_config (name, label, color, "order", show_in_kanban, is_default) VALUES
    ('cancelled',       'Cancelado',         '#616161', 7,  0, 0);

-- Migrar tarefas existentes com status antigos para os novos equivalentes
UPDATE tasks SET status = 'backlog'     WHERE status = 'pending';
UPDATE tasks SET status = 'done'        WHERE status = 'completed';
