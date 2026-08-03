# Design — Suporte a Múltiplos Projetos Azure DevOps

## Visão Geral da Arquitetura

### Princípio central

Cada projeto Azure DevOps tem seu próprio registro em `azure_devops_config`. Tarefas e sprints carregam `azure_devops_config_id` para rastreamento de origem. Dashboards usam esse ID como filtro primário em conjunto com `area_path`.

---

## 1. Banco de Dados

### Migração 002: `002_multi_project_azure.sql`

```sql
-- 1. Adiciona display_name à azure_devops_config
ALTER TABLE azure_devops_config ADD COLUMN display_name TEXT;
UPDATE azure_devops_config SET display_name = project_name WHERE display_name IS NULL;

-- 2. Adiciona azure_devops_config_id às tasks
ALTER TABLE tasks ADD COLUMN azure_devops_config_id INTEGER REFERENCES azure_devops_config(id) ON DELETE SET NULL;

-- 3. Adiciona azure_devops_config_id às sprints
ALTER TABLE sprints ADD COLUMN azure_devops_config_id INTEGER REFERENCES azure_devops_config(id) ON DELETE SET NULL;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_azure_config_id ON tasks(azure_devops_config_id);
CREATE INDEX IF NOT EXISTS idx_sprints_azure_config_id ON sprints(azure_devops_config_id);

-- 5. Migração retroativa: associa tasks/sprints existentes ao único config existente
UPDATE tasks
SET azure_devops_config_id = (SELECT id FROM azure_devops_config LIMIT 1)
WHERE origin = 'azure_devops'
  AND azure_devops_config_id IS NULL
  AND (SELECT COUNT(*) FROM azure_devops_config) = 1;

UPDATE sprints
SET azure_devops_config_id = (SELECT id FROM azure_devops_config LIMIT 1)
WHERE azure_devops_config_id IS NULL
  AND (SELECT COUNT(*) FROM azure_devops_config) = 1;
```

### Entidade atualizada: `AzureDevOpsConfigEntity`

```typescript
// Campos adicionados:
@Column({ name: 'display_name', type: 'text' })
displayName!: string;
```

### Entidades atualizadas: `TaskEntity` e `SprintEntity`

```typescript
// Campo adicionado em ambas:
@Column({ name: 'azure_devops_config_id', type: 'integer', nullable: true })
azureDevOpsConfigId?: number | null;
```

---

## 2. Camada de Serviço — Backend

### `AzureDevOpsService` — Mudanças

**Novo método:** `saveProjectConfig(input: AzureDevOpsProjectInput): Promise<AzureDevOpsConfigEntity>`

- Cria ou atualiza um registro específico por `id`
- Valida unicidade de `display_name` e de `(organization_url, project_name)`

**Novo método:** `listProjects(): Promise<AzureDevOpsProjectConfig[]>`

- Retorna todos os registros com campos públicos (sem PAT)

**Novo método:** `deleteProject(id: number): Promise<void>`

- Remove o registro; FK ON DELETE SET NULL cuida das tasks/sprints

**Novo método:** `testConnectionById(id: number): Promise<boolean>`

- Testa conexão com as credenciais de um projeto específico

**Método atualizado:** `getConfig(includePat?, projectId?)`

- Se `projectId` informado: retorna config daquele projeto
- Se não informado: mantém comportamento atual (primeiro registro ativo) — retrocompatibilidade

**Método atualizado:** `fetchAllWorkItems(configId: number)`

- Recebe o `configId` para buscar com as credenciais corretas e marcar as tasks

**Método atualizado:** `fetchAreaPaths(configId: number)` e `fetchIterationNodes(configId: number)`

- Usam as credenciais do projeto específico

**Método privado atualizado:** `getFullConfig(configId?: number)`

- Se `configId` informado: busca por `id`
- Se não: busca primeiro ativo (retrocompatível)

### `SyncService` — Mudanças

**Método atualizado:** `fullSync()`

```
1. Busca todos os projetos com is_active = true, ordenados por id
2. Para cada projeto (configId):
   a. Emite sync:progress com { projectName, projectIndex, projectTotal }
   b. Chama syncSprints(configId)
   c. Chama syncTeams(configId) [em paralelo com sprints]
   d. Chama fetchAllWorkItems(configId)
   e. Chama syncMembers(workItems)
   f. Chama syncTasks(workItems, sprints, teams, configId)
3. Emite sync:progress step='complete' com resultado consolidado
```

**Métodos atualizados:** `syncSprints(configId)`, `syncTasks(workItems, sprints, teams, configId)`

- Passam `configId` para o upsert, que salva `azureDevOpsConfigId`

**Novo campo em `SyncProgress`:**

```typescript
projectName?: string;   // display_name do projeto sendo sincronizado
projectIndex?: number;  // 1-based
projectTotal?: number;  // total de projetos ativos
```

### `DashboardService` — Mudanças

**Remove:** constantes hardcoded `SUSTENTACAO_AREA_PATH_PATTERN` e `PROJETOS_AREA_PATH_PATTERN`

**Novo parâmetro:** todos os métodos de query passam a aceitar `configId: number`

**Lógica de filtro atualizada:**

```typescript
// Busca area path configurado para o projeto
const config = await azureDevOpsService.getConfig(false, configId);
const areaPattern = config.sustentacaoAreaPath || 'Tribo SEIF\\Sustentação';

// Filtro: configId + area_path
const tasks = await taskRepository.findByConfigAndArea(configId, areaPattern);
// fallback: se task.azureDevOpsConfigId == null, inclui se area_path bate
```

**Novos métodos IPC via `DashboardController`:**

- `getSustentacaoItems(configId)` — aceita configId
- `getSustentacaoMetrics(configId, statuses?)` — aceita configId
- `getProjetosItems(sprintId, configId)` — aceita configId
- `getTaskAllocationData()` — sem mudança (tela única)

### `TaskRepository` — Novo método

```typescript
findByConfigAndArea(configId: number, areaPathPrefix: string): Promise<TaskEntity[]>
// SELECT * FROM tasks
// WHERE (azure_devops_config_id = ? OR (azure_devops_config_id IS NULL))
// AND area_path LIKE ?
// AND status NOT IN (closed statuses)
```

---

## 3. IPC — Novos Canais

### Novos canais em `AzureDevOpsController`

| Canal                             | Parâmetros                | Resposta                     |
| --------------------------------- | ------------------------- | ---------------------------- |
| `azure-devops:listProjects`       | —                         | `AzureDevOpsProjectConfig[]` |
| `azure-devops:saveProject`        | `AzureDevOpsProjectInput` | `AzureDevOpsProjectConfig`   |
| `azure-devops:deleteProject`      | `id: number`              | `void`                       |
| `azure-devops:testConnectionById` | `id: number`              | `boolean`                    |

### Canais existentes atualizados

| Canal                             | Antes                             | Depois                               |
| --------------------------------- | --------------------------------- | ------------------------------------ |
| `azure-devops:saveConfig`         | mantido para retrocompatibilidade | delega para `saveProject`            |
| `azure-devops:getConfig`          | sem parâmetro de projeto          | aceita `configId?` opcional          |
| `dashboard:getSustentacaoItems`   | sem configId                      | aceita `configId: number`            |
| `dashboard:getSustentacaoMetrics` | sem configId                      | aceita `configId: number, statuses?` |
| `dashboard:getProjetosItems`      | `sprintId`                        | `sprintId, configId: number`         |

---

## 4. Tipos Compartilhados (`index.types.ts`)

### Novos tipos

```typescript
// Configuração pública de um projeto (sem PAT)
export interface AzureDevOpsProjectConfig {
  id: number;
  displayName: string;
  organizationUrl: string;
  projectName: string;
  isConfigured: boolean;
  isActive: boolean;
  sustentacaoAreaPath?: string;
  projetosAreaPath?: string;
}

// Input para criar/editar projeto
export interface AzureDevOpsProjectInput {
  id?: number; // presente na edição
  displayName: string;
  organizationUrl: string;
  projectName: string;
  pat?: string; // obrigatório na criação, opcional na edição
  sustentacaoAreaPath?: string;
  projetosAreaPath?: string;
}
```

### Tipo atualizado: `Task`

```typescript
// Campo adicionado:
azureDevOpsConfigId?: number | null;
azureProjectDisplayName?: string;  // resolvido no service, não no banco
```

### Tipo atualizado: `SyncProgress`

```typescript
projectName?: string;
projectIndex?: number;
projectTotal?: number;
```

---

## 5. Frontend — Renderer

### Página: `AzureDevOpsConfig` (refatorada)

**Nova estrutura:**

```
AzureDevOpsConfigPage
├── ProjectList              (lista de projetos com ações)
│   └── ProjectListItem      (linha por projeto: nome, status, botões)
├── ProjectFormModal         (modal de criar/editar)
│   ├── campos: displayName, organizationUrl, projectName, pat, areas
│   └── botão "Testar Conexão" inline
└── ProjectDeleteDialog      (confirmação de remoção)
```

**Hook:** `useAzureDevOpsProjects`

```typescript
{
  projects: AzureDevOpsProjectConfig[];
  loading: boolean;
  listProjects(): Promise<void>;
  saveProject(input: AzureDevOpsProjectInput): Promise<boolean>;
  deleteProject(id: number): Promise<boolean>;
  testConnection(id: number): Promise<boolean>;
}
```

### Componente: `ProjectSelector`

```typescript
// Dropdown reutilizável para selecionar projeto
interface ProjectSelectorProps {
  projects: AzureDevOpsProjectConfig[];
  selectedId: number | null;
  onChange: (id: number) => void;
  size?: 'small' | 'medium';
}
```

### Página: `DashboardSustentacaoPage` (atualizada)

- Adiciona `ProjectSelector` no cabeçalho quando `projects.length > 1`
- Estado: `selectedConfigId: number | null` (persiste no localStorage)
- Passa `configId` para todas as chamadas de API do dashboard
- `useSyncRefresh` → recarrega apenas o projeto selecionado

### Página: `DashboardProjetosPage` (atualizada)

- Mesma lógica de `ProjectSelector`
- Passa `configId` para `getProjetosItems(sprintId, configId)`

### Página: `TaskAllocationPage` (atualizada)

- Mantém lógica atual (tela única)
- `TaskRow` component: adiciona Chip de projeto quando `projects.length > 1`
- Dados: `task.azureProjectDisplayName` (resolvido no backend)

### Página: `TaskManagementPage` (atualizada)

- Adiciona filtro "Projeto" (dropdown) na barra de filtros quando `projects.length > 1`
- Coluna "Equipe": usa `task.azureProjectDisplayName` quando disponível

### Modal: `SyncProgressModal` (atualizado)

- Exibe contador "Projeto X de N" acima da barra de progresso
- Exibe nome do projeto atual sendo sincronizado
- Lista resumo por projeto ao final

### Hook: `useAzureDevOpsProjects` (novo, global)

- Carregado uma vez no nível do provider
- Disponível via Context para todos os componentes que precisam da lista de projetos

---

## 6. Fluxo de Dados por Tela

### Dashboard Sustentação

```
1. Carrega lista de projetos (useAzureDevOpsProjects)
2. Restaura selectedConfigId do localStorage
3. Chama api.dashboard.getSustentacaoItems({ configId: selectedConfigId })
4. DashboardService filtra tasks por configId + sustentacao_area_path
5. Render com dados filtrados
```

### Dashboard Projetos

```
1. Carrega lista de projetos
2. Carrega sprints do projeto selecionado (filtradas por azure_devops_config_id)
3. Chama api.dashboard.getProjetosItems(sprintId, configId)
4. DashboardService filtra tasks por configId + projetos_area_path
```

### Sincronização

```
SyncController.fullSync()
  → AzureDevOpsService.listProjects() → [proj1, proj2, ...]
  → Para cada projeto:
      emit sync:progress({ projectName, projectIndex, projectTotal, step: 'sprints', ... })
      syncSprints(configId)
      syncTeams(configId) [paralelo]
      fetchAllWorkItems(configId) → workItems
      syncMembers(workItems)
      syncTasks(workItems, sprints, teams, configId)
  → emit sync:progress({ step: 'complete', ... })
```

---

## 7. Retrocompatibilidade

- `AzureDevOpsController.saveConfig()` e `getConfig()` mantêm assinatura atual para não quebrar chamadas existentes
- `DashboardController` aceita `configId` como parâmetro opcional; sem ele, usa o primeiro projeto ativo
- Tasks sem `azure_devops_config_id` (legadas) são incluídas nos dashboards se `area_path` bater com o filtro
- Constantes `DEFAULT_SUSTENTACAO_AREA_PATH` e `DEFAULT_PROJETOS_AREA_PATH` permanecem como fallback

---

## 8. Ordem de Implementação Recomendada

1. **Migração SQL** (banco + entidades TypeORM + repositories)
2. **AzureDevOpsService** (multi-config: CRUD de projetos, testConnectionById)
3. **SyncService** (loop multi-projeto, progresso por projeto)
4. **DashboardService** (remove constantes, aceita configId)
5. **Controllers + IPC** (novos canais, tipos compartilhados)
6. **Frontend: AzureDevOpsConfig** (gerenciador de projetos)
7. **Frontend: ProjectSelector** (componente reutilizável)
8. **Frontend: Dashboards** (seletor de projeto)
9. **Frontend: TaskAllocation** (indicador de projeto)
10. **Frontend: TaskManagement** (filtro de projeto)
11. **Frontend: SyncProgressModal** (progresso por projeto)
