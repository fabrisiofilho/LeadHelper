#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
function getNextVersion(): number {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return 1;
  }
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) return 1;
  const lastFile = files[files.length - 1];
  const match = lastFile.match(/^(\d+)_/);
  return match ? parseInt(match[1], 10) + 1 : 1;
}
function createMigration(name: string): void {
  const version = getNextVersion();
  const versionStr = version.toString().padStart(3, '0');
  const fileName = `${versionStr}_${name}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  const template = `-- Migration: ${versionStr}_${name}
-- Description: [Descreva o que esta migration faz]
-- Created: ${new Date().toISOString().split('T')[0]}
-- ============================================
-- UP: Alterações a serem aplicadas
-- ============================================
-- Exemplo: Criar nova tabela
-- CREATE TABLE IF NOT EXISTS nova_tabela (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     nome TEXT NOT NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );
-- Exemplo: Adicionar coluna
-- ALTER TABLE tabela_existente ADD COLUMN nova_coluna TEXT;
-- Exemplo: Criar índice
-- CREATE INDEX IF NOT EXISTS idx_tabela_coluna ON tabela(coluna);
-- ============================================
-- Registra a migration como aplicada
-- ============================================
INSERT OR IGNORE INTO migrations (name, applied_at) VALUES ('${versionStr}_${name}', CURRENT_TIMESTAMP);
`;
  fs.writeFileSync(filePath, template);
  console.log(`✅ Migration criada: ${fileName}`);
  console.log(`   Caminho: ${filePath}`);
}
function showStatus(): void {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('❌ Diretório de migrations não encontrado');
    return;
  }
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  console.log('\n📋 Migrations disponíveis:\n');
  if (files.length === 0) {
    console.log('   Nenhuma migration encontrada');
  } else {
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
  }
  console.log('\n💡 Para verificar o status no banco, execute a aplicação.');
}
function showHelp(): void {
  console.log(`
📦 Migration CLI - Gerenciador de Migrations SQLite
Comandos disponíveis:
  create <nome>   Cria uma nova migration com o nome especificado
                  Exemplo: npm run migration:create add_user_phone
  status          Lista todas as migrations disponíveis
  help            Mostra esta ajuda
Exemplos:
  # Criar uma nova migration
  npm run migration:create add_user_phone_column
  # Ver migrations disponíveis
  npm run migration:status
Notas:
  - As migrations são executadas automaticamente ao iniciar a aplicação
  - Use nomes descritivos em snake_case
  - Cada migration deve ser idempotente (pode ser executada múltiplas vezes)
`);
}
const [, , command, ...args] = process.argv;
switch (command) {
  case 'create':
    if (!args[0]) {
      console.error('❌ Erro: Nome da migration é obrigatório');
      console.log('   Uso: npm run migration:create <nome>');
      process.exit(1);
    }
    createMigration(args[0]);
    break;
  case 'status':
    showStatus();
    break;
  case 'help':
  default:
    showHelp();
    break;
}
