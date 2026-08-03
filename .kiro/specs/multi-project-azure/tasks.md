# Tasks de Implementação — Suporte a Múltiplos Projetos Azure DevOps

## Task 1: Migração do Banco de Dados e Entidades TypeORM

- [ ] 1.1 Criar arquivo `src/main/infrastructure/database/migrations/002_multi_project_azure.sql` com:
  - ALTER TABLE `azure_devops_config` ADD COLUMN `display_name TEXT`
  - UPDATE retroativo: `display_name = project_name` para registros existentes
  - ALTER TABLE `tasks` ADD COLUMN `azure_devops_config_id INTEGER REFERENCES azure_devops_config(id) ON DELETE SET NULL`
  - ALTER TABLE `sprints` ADD COLUMN `azure_devops_config_id INTEGER REFERENCES azure_devops_config(id) ON DELETE SET NULL`
  - CREATE INDEX em `tasks(azure_devops_config_id)` e `sprints(azure_devops_config_id)`
  - UPDATE retroativo de tasks e sprints para associar ao único config existente (quando houver exatamente 1)

- [ ] 1.2 Atualizar `AzureDevOpsConfigEntity` com campo `displayName` mapeado para `display_name`

- [ ] 1.3 Atualizar `TaskEntity` com campo `azureDevOpsConfigId` (nullable integer)

- [ ] 1.4 Atualizar `SprintEntity` com campo `azureDevOpsConfigId` (nullable integer)

- [ ] 1.5 Adicionar método `findByConfigAndArea(configId, areaPathPrefix)` ao `TaskRepository`

- [ ] 1.6 Adicionar método `findByConfigId(configId)` ao `SprintRepository`

**Requisitos:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3

---

## Task 2: Tipos Compartilhados e Interfaces IPC

- [ ] 2.1 Adicionar tipos em `src/shared/interfaces/config/index.types.ts`:
  - `AzureDevOpsProjectConfig` (configuração pública por projeto, sem PAT)
  - `AzureDevOpsProjectInput` (input para criar/editar projeto)
  - Adicionar campo `azureDevOpsConfigId?: number | null` em `Task`
  - Adicionar campo `azureProjectDisplayName?: string` em `Task`
  - Adicionar campos `projectName?`, `projectIndex?`, `projectTotal?` em `SyncProgress` (ou criar interface)

- [ ] 2.2 Adicionar métodos em `IAzureDevOpsController` (interface):
  - `listProjects(): Promise<ApiResponse<AzureDevOpsProjectConfig[]>>`
  - `saveProject(input: AzureDevOpsProjectInput): Promise<ApiResponse<AzureDevOpsProjectConfig>>`
  - `deleteProject(id: number): Promise<ApiResponse<void>>`
  - `testConnectionById(id: number): Promise<ApiResponse<boolean>>`

- [ ] 2.3 Atualizar `CustomElectronAPI` no preload para incluir os novos métodos

- [ ] 2.4 Atualizar `controller-config.ts` para adicionar os novos métodos ao namespace `azureDevOps`

**Requisitos:** 2.1, 2.2, 2.3, 3.3, 6.1, 7.4

---

## Task 3: AzureDevOpsService — Suporte Multi-projeto

- [ ] 3.1 Atualizar método `getFullConfig(configId?)`:
  - Se `configId` informado: `findOne({ where: { id: configId } })`
  - Se não: `findOne({ where: { isActive: true } })` (retrocompatível)

- [ ] 3.2 Atualizar método `getConfig(includePat?, configId?)` para aceitar configId opcional

- [ ] 3.3 Implementar método `listProjects(): Promise<AzureDevOpsProjectConfig[]>` — retorna todos os registros sem PAT

- [ ] 3.4 Implementar método `saveProject(input: AzureDevOpsProjectInput)`:
  - Cria novo registro se `input.id` não informado
  - Atualiza registro existente se `input.id` informado
  - Mantém PAT existente se novo PAT não for fornecido na edição
  - Valida unicidade de `display_name` e de `(organization_url, project_name)`
  - Criptografa PAT com AES-256-GCM

- [ ] 3.5 Implementar método `deleteProject(id: number)` — remove registro pelo id

- [ ] 3.6 Implementar método `testConnectionById(id: number)` — testa conexão com credenciais do projeto específico

- [ ] 3.7 Atualizar `fetchAllWorkItems(configId: number)` para usar credenciais do projeto específico

- [ ] 3.8 Atualizar `fetchAreaPaths(configId: number)` para usar credenciais do projeto específico

- [ ] 3.9 Atualizar `fetchIterationNodes(configId: number)` para usar credenciais do projeto específico

**Requisitos:** 2.4, 2.8, 2.10, 3.6

---

## Task 4: SyncService — Loop Multi-projeto

- [ ] 4.1 Atualizar `fullSync()` para:
  - Buscar todos os projetos com `is_active = true` ordenados por `id`
  - Se nenhum projeto ativo, lançar erro descritivo
  - Loop sequencial por projeto, emitindo `sync:progress` com `projectName`, `projectIndex`, `projectTotal`
  - Capturar erros por projeto sem interromper os demais

- [ ] 4.2 Atualizar `syncSprints(configId: number)` para:
  - Usar `fetchIterationNodes(configId)` com as credenciais corretas
  - Salvar `azure_devops_config_id = configId` em cada sprint criada/atualizada

- [ ] 4.3 Atualizar `syncTeams(configId: number)` para:
  - Usar `fetchAreaPaths(configId)` com as credenciais corretas

- [ ] 4.4 Atualizar `syncTasks(workItems, sprints, teams, configId: number)` para:
  - Salvar `azure_devops_config_id = configId` em cada task criada/atualizada

- [ ] 4.5 Atualizar `SyncProgress` interface/type e todos os `emitProgress()` para incluir campos de projeto

- [ ] 4.6 Atualizar notificação nativa de mudança de status para incluir `display_name` do projeto

**Requisitos:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10

---

## Task 5: DashboardService — Remoção das Constantes Hardcoded

- [ ] 5.1 Injetar `AzureDevOpsService` no `DashboardService` (via construtor ou lazy-load)

- [ ] 5.2 Substituir `SUSTENTACAO_AREA_PATH_PATTERN` por leitura dinâmica:
  - `const config = await azureDevOpsService.getConfig(false, configId)`
  - `const pattern = config?.sustentacaoAreaPath || 'Tribo SEIF\\Sustentação'`

- [ ] 5.3 Substituir `PROJETOS_AREA_PATH_PATTERN` por leitura dinâmica com fallback análogo

- [ ] 5.4 Atualizar `getSustentacaoItems(options?, configId: number)` para filtrar por `configId`

- [ ] 5.5 Atualizar `getSustentacaoMetrics(statuses?, configId: number)` para filtrar por `configId`

- [ ] 5.6 Atualizar `getSustentacaoMembersWithCards(configId: number)` para filtrar por `configId`

- [ ] 5.7 Atualizar `getProjetosItems(sprintId, configId: number)` para filtrar por `configId`

- [ ] 5.8 Atualizar `getTaskAllocationData()` para incluir `azureProjectDisplayName` em cada tarefa (resolve `display_name` via `azure_devops_config_id`)

- [ ] 5.9 Atualizar `classifyArea(areaPath, configId?)` para usar area paths configurados do projeto

**Requisitos:** 4.3, 5.3, 9.4, 9.5

---

## Task 6: Controllers e IPC — Novos Canais

- [ ] 6.1 Adicionar handlers em `AzureDevOpsController`:
  - `@IpcMethod('azure-devops:listProjects')` → `listProjects()`
  - `@IpcMethod('azure-devops:saveProject')` → `saveProject(input)`
  - `@IpcMethod('azure-devops:deleteProject')` → `deleteProject(id)`
  - `@IpcMethod('azure-devops:testConnectionById')` → `testConnectionById(id)`

- [ ] 6.2 Atualizar `DashboardController` para aceitar `configId` nos métodos:
  - `getSustentacaoItems({ configId, ...options })`
  - `getSustentacaoMetrics(statuses?, configId?)`
  - `getProjetosItems(sprintId, configId?)`
  - Parâmetro `configId` deve ser obrigatório quando há múltiplos projetos; opcional com fallback quando há apenas um

- [ ] 6.3 Atualizar `SyncController.buildStatus()` para incluir lista de projetos no status

**Requisitos:** 2.2, 2.3, 2.4, 3.3

---

## Task 7: Frontend — Gerenciador de Projetos Azure DevOps

- [ ] 7.1 Criar hook `useAzureDevOpsProjects` em `src/renderer/src/hooks/useAzureDevOpsProjects.ts`:
  - Estado: `projects`, `loading`, `error`
  - Métodos: `listProjects`, `saveProject`, `deleteProject`, `testConnection`

- [ ] 7.2 Criar componente `ProjectFormModal` em `src/renderer/src/pages/AzureDevOpsConfig/components/ProjectFormModal/index.tsx`:
  - Campos: displayName, organizationUrl, projectName, pat (password), sustentacaoAreaPath, projetosAreaPath
  - Modo criação (PAT obrigatório) e edição (PAT opcional)
  - Botão "Testar Conexão" inline no formulário
  - Validação de URL com `https://` e campos obrigatórios

- [ ] 7.3 Criar componente `ProjectListItem` em `src/renderer/src/pages/AzureDevOpsConfig/components/ProjectListItem/index.tsx`:
  - Exibe: displayName, projectName, organizationUrl, status de conexão, is_active
  - Botões: Editar, Remover, Testar Conexão

- [ ] 7.4 Criar componente `ProjectDeleteDialog` para confirmação de remoção com aviso sobre desassociação das tarefas

- [ ] 7.5 Refatorar `AzureDevOpsConfigPage` (`src/renderer/src/pages/AzureDevOpsConfig/index.tsx`) para:
  - Exibir lista de projetos com `ProjectListItem`
  - Botão "Adicionar Projeto" abrindo `ProjectFormModal`
  - Estado vazio quando sem projetos (mensagem + botão de adicionar destacado)
  - Manter aba de sincronização existente

**Requisitos:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 8.2

---

## Task 8: Frontend — Componente ProjectSelector (reutilizável)

- [ ] 8.1 Criar `src/renderer/src/components/ProjectSelector/index.tsx`:

  ```typescript
  interface ProjectSelectorProps {
    projects: AzureDevOpsProjectConfig[];
    selectedId: number | null;
    onChange: (id: number) => void;
    size?: 'small' | 'medium';
    label?: string;
  }
  ```

  - Renderiza MUI `Select` com lista de projetos
  - Não renderiza nada se `projects.length <= 1` (o pai controla isso)

- [ ] 8.2 Criar Context/Provider para projetos em `src/renderer/src/providers/AzureProjectsProvider.tsx`:
  - Carrega lista de projetos uma vez no bootstrap
  - Disponibiliza via `useAzureProjects()` hook
  - Recarrega após sincronização completa

- [ ] 8.3 Integrar `AzureProjectsProvider` no `WithProviders` (`src/renderer/src/providers/index.tsx`)

**Requisitos:** 4.1, 4.2, 5.1, 5.2

---

## Task 9: Frontend — Dashboard Sustentação com Seletor de Projeto

- [ ] 9.1 Atualizar `DashboardSustentacaoPage` para:
  - Consumir `useAzureProjects()` para obter lista de projetos
  - Exibir `ProjectSelector` no cabeçalho quando `projects.length > 1`
  - Gerenciar estado `selectedConfigId` com persistência no `localStorage` (chave: `dashboard-sustentacao-project-id`)
  - Restaurar seleção do localStorage; se projeto não existir mais, usar o primeiro ativo
  - Passar `configId: selectedConfigId` para todas as chamadas de API do dashboard

- [ ] 9.2 Atualizar chamadas IPC no Dashboard Sustentação:
  - `api.dashboard.getSustentacaoItems({ configId })` em vez de sem parâmetro
  - `api.dashboard.getSustentacaoMetrics(statuses, configId)`
  - `api.dashboard.invalidateCache()` mantido sem mudança

- [ ] 9.3 Atualizar `useSyncRefresh` para recarregar apenas com o `configId` atual

**Requisitos:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

---

## Task 10: Frontend — Dashboard Projetos com Seletor de Projeto

- [ ] 10.1 Atualizar `DashboardProjetosPage` para:
  - Consumir `useAzureProjects()`
  - Exibir `ProjectSelector` quando `projects.length > 1`
  - Gerenciar `selectedConfigId` com localStorage (chave: `dashboard-projetos-project-id`)
  - Filtrar sprints disponíveis para o projeto selecionado

- [ ] 10.2 Atualizar chamadas IPC:
  - `api.dashboard.getProjetosItems(sprintId, configId)`

- [ ] 10.3 Atualizar `useSyncRefresh` para recarregar com `configId` atual

**Requisitos:** 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7

---

## Task 11: Frontend — Alocação de Tarefas com Indicador de Projeto

- [ ] 11.1 Atualizar `TaskRow` em `TaskAllocationPage` para:
  - Exibir Chip com `task.azureProjectDisplayName` quando `projects.length > 1` e `task.origin === 'azure_devops'`
  - Exibir Chip "Projeto desconhecido" em cor neutra quando `azureDevOpsConfigId === null`
  - Omitir Chip quando `projects.length <= 1` ou tarefa é manual

- [ ] 11.2 Garantir que `getTaskAllocationData()` retorne `azureProjectDisplayName` em cada tarefa (backend — Task 5.8)

**Requisitos:** 6.1, 6.2, 6.3, 6.4, 6.5

---

## Task 12: Frontend — Gestão de Tarefas com Filtro de Projeto

- [ ] 12.1 Atualizar `TaskManagementPage` para:
  - Consumir `useAzureProjects()`
  - Exibir filtro "Projeto Azure DevOps" (Select) quando `projects.length > 1`
  - Adicionar campo `azureConfigId: string` (valor 'all' ou id do projeto) ao `TaskManagementFilters`
  - Filtrar `filteredTasks` pelo `azureDevOpsConfigId` da task quando filtro ativo

- [ ] 12.2 Atualizar coluna "Equipe" na tabela de Gestão de Tarefas:
  - Quando `projects.length > 1`: usar `task.azureProjectDisplayName` se disponível
  - Quando `azureProjectDisplayName` é null/undefined: manter lógica atual por `area_path`

**Requisitos:** 7.1, 7.2, 7.3, 7.4, 7.5

---

## Task 13: Frontend — Modal de Progresso de Sincronização

- [ ] 13.1 Atualizar `SyncProgressModal` para:
  - Exibir contador "Projeto X de N" quando `projectTotal > 1`
  - Exibir nome do projeto atual: `sync:progress.projectName`
  - Exibir chips de status por projeto ao final (lista de projetos com resultado: sucesso/aviso/erro)
  - Barra de progresso global: `(projectIndex - 1) * (100/N) + (stepProgress * (1/N))`

- [ ] 13.2 Atualizar tipo `SyncProgress` no renderer para incluir campos `projectName`, `projectIndex`, `projectTotal`

**Requisitos:** 3.2, 3.3, 3.4, 3.5

---

## Task 14: Testes e Validação

- [ ] 14.1 Verificar que a migração 002 executa sem erros em banco vazio
- [ ] 14.2 Verificar que a migração 002 executa sem erros em banco com dados existentes (retrocompatibilidade)
- [ ] 14.3 Verificar que tasks legadas sem `azure_devops_config_id` são associadas corretamente pelo retroativo
- [ ] 14.4 Executar `npm run lint` e corrigir todos os erros
- [ ] 14.5 Verificar que o fluxo completo de adicionar projeto → sincronizar → visualizar dashboard funciona end-to-end
- [ ] 14.6 Verificar que o sistema com um único projeto não exibe seletores de projeto nas telas
