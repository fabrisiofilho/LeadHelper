-- Migration 002: Suporte a Múltiplos Projetos Azure DevOps
-- Transforma azure_devops_config de singleton para multi-linha.
-- Adiciona azure_devops_config_id em tasks e sprints.
-- Executa migração retroativa para dados existentes.

-- ============================================================
-- 1. Adiciona display_name à azure_devops_config
--    (usa project_name como fallback para registros existentes)
-- ============================================================
ALTER TABLE azure_devops_config ADD COLUMN display_name TEXT;
UPDATE azure_devops_config SET display_name = project_name WHERE display_name IS NULL;

-- ============================================================
-- 2. Adiciona azure_devops_config_id às tarefas
-- ============================================================
ALTER TABLE tasks ADD COLUMN azure_devops_config_id INTEGER REFERENCES azure_devops_config(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Adiciona azure_devops_config_id às sprints
-- ============================================================
ALTER TABLE sprints ADD COLUMN azure_devops_config_id INTEGER REFERENCES azure_devops_config(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Índices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_azure_config_id ON tasks(azure_devops_config_id);
CREATE INDEX IF NOT EXISTS idx_sprints_azure_config_id ON sprints(azure_devops_config_id);

-- ============================================================
-- 5. Migração retroativa: associa tasks existentes ao único
--    config já cadastrado (somente quando houver exatamente 1)
-- ============================================================
UPDATE tasks
SET azure_devops_config_id = (SELECT id FROM azure_devops_config LIMIT 1)
WHERE origin = 'azure_devops'
  AND azure_devops_config_id IS NULL
  AND (SELECT COUNT(*) FROM azure_devops_config) = 1;

-- ============================================================
-- 6. Migração retroativa: associa sprints existentes
-- ============================================================
UPDATE sprints
SET azure_devops_config_id = (SELECT id FROM azure_devops_config LIMIT 1)
WHERE azure_devops_config_id IS NULL
  AND (SELECT COUNT(*) FROM azure_devops_config) = 1;

-- ============================================================
-- 7. Registrar migração
-- ============================================================
INSERT INTO migrations (name) VALUES ('002_multi_project_azure');
