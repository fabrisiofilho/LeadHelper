-- Migration 011: Configurable SLA rules per project and sub-area
-- Allows each azure_devops_config to have custom SLA limits per priority per sub-area.
-- sub_area values: 'gestao_terceiros', 'chamada_tecnologica', 'outros'
-- priority values: 'critical', 'high', 'medium', 'low'
-- hours_limit: business hours allowed before SLA violation
-- Default values mirror the hardcoded SLA_LIMITS: critical=4h, high=8h, medium=24h, low=40h

CREATE TABLE IF NOT EXISTS sla_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    azure_devops_config_id INTEGER NOT NULL REFERENCES azure_devops_config(id) ON DELETE CASCADE,
    sub_area TEXT NOT NULL,
    priority TEXT NOT NULL,
    hours_limit REAL NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (azure_devops_config_id, sub_area, priority)
);

-- Seed default SLA values for every existing project × sub_area × priority combination
-- This INSERT...SELECT creates rows only for projects that exist in azure_devops_config
INSERT OR IGNORE INTO sla_configs (azure_devops_config_id, sub_area, priority, hours_limit)
SELECT c.id, s.sub_area, p.priority, p.hours_limit
FROM azure_devops_config c
CROSS JOIN (
    SELECT 'gestao_terceiros' AS sub_area UNION ALL
    SELECT 'chamada_tecnologica'          UNION ALL
    SELECT 'outros'
) s
CROSS JOIN (
    SELECT 'critical' AS priority, 4.0  AS hours_limit UNION ALL
    SELECT 'high',                 8.0                  UNION ALL
    SELECT 'medium',               24.0                 UNION ALL
    SELECT 'low',                  40.0
) p;

INSERT INTO migrations (name) VALUES ('011_sla_config');
