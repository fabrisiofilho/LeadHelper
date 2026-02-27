# Plano de Implementação: Reestruturação do Hub Azure DevOps

## Visão Geral

Implementação incremental da reestruturação do Hub para funcionar como hub centralizado de planejamento integrado ao Azure DevOps (somente leitura). A abordagem segue: migração de banco → entidades → parsers → sync service → serviços de negócio → IPC → frontend.

## Tarefas

- [x] 1. Migração de banco de dados e atualização de entidades
  - [x] 1.1 Consolidar todas as migrações em uma única `001_leadhelper_schema.sql`
    - Criar arquivo `001_leadhelper_schema.sql` com schema completo do zero
    - Incluir todas as tabelas: migrations, users, positions, teams, team_members, team_member_allocations, sprints, tasks, task_comments, azure_devops_config
    - Incluir campos novos: `iteration_path` em sprints, `azure_unique_id` em team_members, `assigned_to_name` e `assigned_to_email` em tasks
    - Remover tabelas obsoletas do schema: `allocations`, `task_status_config`, `team_member_teams`
    - Remover colunas obsoletas de `tasks`: `estimation_points`, `estimation_hours`, `estimation_type`, `external_source`, `assignee_id`
    - Remover coluna `dedication_percentage` de `team_member_allocations`
    - Incluir dados padrão de cargos (positions)
    - Incluir índices para `iteration_path` e `azure_unique_id`
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 1.1.1 Remover arquivos de migração antigos (002 a 008)
    - Excluir arquivos `002_*.sql` a `008_*.sql` do diretório de migrações
    - Ajustar código de execução de migrações para reconhecer schema consolidado
    - _Requisitos: 12.7_

  - [x] 1.1.2 Remover `AllocationEntity` e código relacionado
    - Remover entidade `AllocationEntity` (tabela `allocations` removida)
    - Remover `allocation-controller`, `allocation-service`, `allocation-repository`
    - Remover imports e referências órfãs à entidade de alocação membro-tarefa
    - _Requisitos: 12.2_

  - [x] 1.1.3 Remover `TaskStatusConfigEntity` e código relacionado
    - Remover entidade `TaskStatusConfigEntity` (tabela `task_status_config` removida)
    - Remover controller, service e repository relacionados ao task_status_config
    - Remover imports e referências órfãs
    - _Requisitos: 12.2_

  - [x] 1.2 Atualizar `SprintEntity` com decorador TypeORM para `iterationPath`
    - Adicionar `@Column({ name: 'iteration_path', nullable: true })` ao SprintEntity
    - _Requisitos: 8.1_

  - [x] 1.3 Atualizar `TeamMemberEntity` com decorador TypeORM para `azureUniqueId`
    - Adicionar `@Column({ name: 'azure_unique_id', nullable: true })` ao TeamMemberEntity
    - _Requisitos: 8.2_

  - [x] 1.4 Atualizar `TaskEntity` com decoradores TypeORM para `assignedToName` e `assignedToEmail` e remover campos obsoletos
    - Adicionar `@Column({ name: 'assigned_to_name', nullable: true })` ao TaskEntity
    - Adicionar `@Column({ name: 'assigned_to_email', nullable: true })` ao TaskEntity
    - Remover propriedades `estimationPoints`, `estimationHours`, `estimationType`, `externalSource` do TaskEntity
    - Remover relação `allocations` do TaskEntity (tabela `allocations` removida)
    - _Requisitos: 8.3, 8.4, 12.3_

  - [x] 1.5 Atualizar `TeamMemberAllocationEntity` para remover `dedicationPercentage` do schema
    - Remover a propriedade `dedicationPercentage` e seu decorador `@Column` da entidade
    - Garantir que o campo `notes` seja utilizado como "Motivo"
    - _Requisitos: 8.5, 8.6, 12.4_

  - [x] 1.6 Atualizar `TeamMemberEntity` para remover relação com tabela `allocations`
    - Remover relação `allocations` do TeamMemberEntity (tabela `allocations` removida)
    - _Requisitos: 12.2_

- [x] 2. Checkpoint — Verificar migração e entidades
  - Garantir que a migração executa sem erros e as entidades refletem os novos campos. Perguntar ao usuário se há dúvidas.

- [x] 3. Implementar módulo de Parsers (funções puras)
  - [x] 3.1 Criar `src/main/application/parsers/sprint-parser.ts`
    - Implementar `parseSprint(node)`, `parseSprintMany(nodes)` e `flattenIterationTree(root)`
    - Achatar árvore de iterações recursivamente
    - Ignorar nós sem `startDate` ou `finishDate`
    - Mapear `path` para `iterationPath`
    - _Requisitos: 1.2, 10.1_

  - [ ]\* 3.2 Escrever teste de propriedade para Sprint Parser (Property 1)
    - **Property 1: Round-trip do Sprint Parser**
    - Gerar `Arbitrary<AzureIterationNode>` com name, path, startDate, finishDate
    - Parsear → pretty-print → parsear novamente → verificar equivalência
    - **Valida: Requisito 10.1**

  - [x] 3.3 Criar `src/main/application/parsers/team-parser.ts`
    - Implementar `parseTeam(node)`, `parseTeamMany(nodes)` e `flattenAreaTree(root)`
    - Achatar árvore de area paths recursivamente
    - Mapear `name` para `team.name` e `path` para `team.azureAreaPath`
    - _Requisitos: 1.3, 10.2_

  - [ ]\* 3.4 Escrever teste de propriedade para Team Parser (Property 2)
    - **Property 2: Round-trip do Team Parser**
    - Gerar `Arbitrary<AzureAreaNode>` com name, path
    - Parsear → pretty-print → parsear novamente → verificar equivalência
    - **Valida: Requisito 10.2**

  - [x] 3.5 Criar `src/main/application/parsers/member-parser.ts`
    - Implementar `parseMember(assignedTo)`, `parseMemberMany(list)` e `deduplicateMembers(members)`
    - Extrair `displayName`, `uniqueName` (email) e `id` (azureUniqueId)
    - Deduplicar por email
    - _Requisitos: 1.4, 10.3_

  - [ ]\* 3.6 Escrever teste de propriedade para Member Parser (Property 3)
    - **Property 3: Round-trip do Member Parser**
    - Gerar `Arbitrary<AzureAssignedTo>` com displayName, uniqueName, id
    - Parsear → pretty-print → parsear novamente → verificar equivalência
    - **Valida: Requisito 10.3**

  - [x] 3.7 Criar `src/main/application/parsers/task-parser.ts`
    - Implementar `parseTask(workItem)` e `parseTaskMany(workItems)`
    - Utilizar `mapWorkItemType()` e `mapWorkItemStateToTaskStatus()` existentes
    - Extrair `assignedToName` e `assignedToEmail` do campo `System.AssignedTo`
    - Definir `origin: 'azure_devops'` e `externalId` como string do ID
    - _Requisitos: 1.1, 10.4_

  - [ ]\* 3.8 Escrever teste de propriedade para Task Parser (Property 4)
    - **Property 4: Round-trip do Task Parser**
    - Gerar `Arbitrary<AzureWorkItem>` com todos os campos System._ e Microsoft.VSTS._
    - Parsear → pretty-print → parsear novamente → verificar equivalência
    - **Valida: Requisito 10.4**

  - [x] 3.9 Criar pretty-printers de teste em `test/helpers/pretty-printers.ts`
    - Implementar `sprintToAzureFormat()`, `teamToAzureFormat()`, `memberToAzureFormat()`, `taskToAzureFormat()`
    - Estes existem APENAS no código de teste, nunca em produção
    - _Requisitos: 10.1, 10.2, 10.3, 10.4_

- [x] 4. Checkpoint — Verificar parsers e testes de propriedade
  - Garantir que todos os parsers funcionam corretamente e os testes de propriedade passam. Perguntar ao usuário se há dúvidas.

- [x] 5. Implementar AzureDevOpsService (novos métodos) e SyncService
  - [x] 5.1 Adicionar `fetchAreaPaths()` ao `AzureDevOpsService`
    - Implementar chamada GET para `classificationnodes/Areas?$depth=10`
    - Retornar `AzureAreaNode[]`
    - _Requisitos: 1.3_

  - [x] 5.2 Adicionar `fetchAllWorkItems()` ao `AzureDevOpsService`
    - Executar WIQL sem filtro de IDs específicos para buscar TODOS os work items
    - Respeitar limite de 200 IDs por batch na busca de detalhes
    - _Requisitos: 1.1_

  - [x] 5.3 Marcar métodos deprecados no `AzureDevOpsService`
    - Marcar `importWorkItems()`, `getReportData()`, `getDashboardMetrics()` com `@deprecated`
    - _Requisitos: 1.8_

  - [x] 5.4 Criar `src/main/application/services/sync-service.ts`
    - Implementar `SyncService` com método `fullSync()` como orquestrador central
    - Implementar `syncSprints()`: buscar iterações → parsear → upsert por `iterationPath`
    - Implementar `syncTeams()`: buscar area paths → parsear → upsert por `azureAreaPath`
    - Implementar `syncMembers(workItems)`: parsear assigned to → upsert por `email`
    - Implementar `syncTasks(workItems, sprints, teams)`: parsear → upsert por `externalId` + `origin`
    - Resolver relacionamentos: Task→Sprint por iterationPath, Task→Team por areaPath
    - Retornar `FullSyncResult` com contadores e erros
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_

  - [ ]\* 5.5 Escrever teste de propriedade para sincronização (Property 5)
    - **Property 5: Sincronização persiste todos os work items**
    - Gerar `Arbitrary<AzureWorkItem[]>` com IDs únicos
    - Após fullSync, verificar que todos os work items existem no banco com `origin='azure_devops'`
    - **Valida: Requisito 1.1**

- [x] 6. Implementar alterações no TeamMemberAllocationService
  - [x] 6.1 Alterar validação de `create()` no `TeamMemberAllocationService`
    - Remover validação de `dedicationPercentage` e `getTotalDedication()`
    - Tornar `notes` obrigatório (campo "Motivo") — rejeitar se vazio ou ausente
    - Substituir `findOverlapping` por `validateCrossTeamUniqueness` (todas as equipes)
    - Mensagem de erro: "Membro já está alocado na equipe {nome}. Finalize a alocação atual antes de criar uma nova."
    - _Requisitos: 2.2, 2.3, 9.2, 9.3_

  - [x] 6.2 Implementar `detectAllocationConflicts()` no `TeamMemberAllocationService`
    - Detectar membros alocados na equipe X com tarefas na equipe Y (X ≠ Y)
    - Retornar `AllocationConflict[]` com memberId, memberName, equipes e tarefa
    - _Requisitos: 9.1_

  - [ ]\* 6.3 Escrever teste de propriedade para unicidade cross-team (Property 6)
    - **Property 6: Unicidade de alocação ativa entre equipes**
    - Gerar `Arbitrary<{member, teamA, teamB, dates}>` com equipes diferentes
    - Verificar que segunda alocação ativa é rejeitada
    - **Valida: Requisitos 9.2, 9.3**

  - [ ]\* 6.4 Escrever teste de propriedade para conflito alocação vs tarefas (Property 7)
    - **Property 7: Detecção de conflito alocação vs tarefas**
    - Gerar `Arbitrary<{member, allocation, tasks}>` com area paths diferentes
    - Verificar que `detectAllocationConflicts()` retorna conflito
    - **Valida: Requisito 9.1**

  - [ ]\* 6.5 Escrever teste de propriedade para motivo obrigatório (Property 8)
    - **Property 8: Campo Motivo obrigatório na alocação**
    - Gerar `Arbitrary<CreateTeamMemberAllocationInput>` com notes vazio e preenchido
    - Verificar que notes vazio é rejeitado e preenchido é aceito
    - **Valida: Requisito 2.3**

- [x] 7. Checkpoint — Verificar sync service e alocação
  - Garantir que fullSync funciona, alocação valida cross-team e conflitos são detectados. Perguntar ao usuário se há dúvidas.

- [x] 8. Implementar restrição de somente leitura e DashboardService expandido
  - [x] 8.1 Adicionar validação de somente leitura no `TaskService`
    - Rejeitar atualização de campos originados do Azure DevOps em TaskEntity com `origin='azure_devops'`
    - Bloquear criação manual de tarefas (toda tarefa vem do Azure DevOps)
    - Mensagem: "Esta tarefa é gerenciada no Azure DevOps e não pode ser editada localmente."
    - _Requisitos: 4.2, 4.3, 4.5, 11.2, 11.3_

  - [x] 8.2 Adicionar validação de somente leitura no `SprintService`
    - Rejeitar edição de SprintEntity com `iterationPath` preenchido
    - Mensagem: "Esta sprint é gerenciada no Azure DevOps e não pode ser editada localmente."
    - _Requisitos: 5.2, 11.2, 11.4_

  - [ ]\* 8.3 Escrever teste de propriedade para somente leitura (Property 9)
    - **Property 9: Somente leitura para dados sincronizados**
    - Gerar `Arbitrary<TaskEntity>` com `origin='azure_devops'` e `Arbitrary<SprintEntity>` com iterationPath
    - Verificar que tentativas de edição são rejeitadas
    - **Valida: Requisitos 4.5, 11.2**

  - [ ]\* 8.4 Escrever teste de propriedade para dados locais editáveis (Property 10)
    - **Property 10: Dados locais são editáveis**
    - Gerar `Arbitrary<CreateInput>` para TeamMemberAllocation, Position, Team, TeamMember
    - Verificar que operações CRUD são permitidas com dados válidos
    - **Valida: Requisito 11.5**

  - [x] 8.5 Expandir `DashboardService` com 3 dashboards por contexto
    - Implementar `getAllocationDashboard()`: alocações ativas, membros sem alocação, conflitos, alocações por equipe
    - Implementar `getTaskManagementDashboard()`: total de tarefas, por status, por tipo, por equipe, não atribuídas
    - Implementar `getSprintDashboard()`: sprints ativas, completadas, tarefas por sprint, velocity
    - Todos os métodos usam exclusivamente dados do Banco_Local (sem chamadas à API Azure)
    - _Requisitos: 3.1, 3.2, 3.3, 3.5, 3.7_

  - [ ]\* 8.6 Escrever teste de propriedade para filtro por sprint (Property 11)
    - **Property 11: Filtragem de tarefas por sprint**
    - Gerar `Arbitrary<{sprints, tasks}>` com associações variadas
    - Verificar que filtro retorna apenas tarefas da sprint selecionada
    - **Valida: Requisitos 5.1, 5.4**

  - [ ]\* 8.7 Escrever teste de propriedade para dashboard (Property 12)
    - **Property 12: Dashboard reflete dados sincronizados**
    - Gerar `Arbitrary<{tasks, sprints, allocations}>` inseridos no banco
    - Verificar que métricas do DashboardService são consistentes com os dados
    - **Valida: Requisito 3.7**

- [x] 9. Checkpoint — Verificar somente leitura e dashboards
  - Garantir que restrições de somente leitura funcionam e dashboards retornam dados corretos. Perguntar ao usuário se há dúvidas.

- [x] 10. Implementar IPC channels (controllers)
  - [x] 10.1 Criar `SyncController` com channel `azure-devops:fullSync`
    - Registrar handler IPC que chama `SyncService.fullSync()`
    - Verificar configuração Azure DevOps antes de executar sync
    - Retornar `ApiResponse<FullSyncResult>`
    - _Requisitos: 1.1, 1.6_

  - [x] 10.2 Criar/atualizar `DashboardController` com novos channels
    - Registrar `dashboard:getAllocationDashboard`, `dashboard:getTaskManagementDashboard`, `dashboard:getSprintDashboard`
    - Cada channel chama o método correspondente do `DashboardService`
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 10.3 Adicionar channel `allocation:detectConflicts` ao `AllocationController`
    - Registrar handler que chama `TeamMemberAllocationService.detectAllocationConflicts()`
    - _Requisitos: 9.1_

  - [x] 10.4 Remover channels deprecados
    - Remover handlers: `azure-devops:importWorkItems`, `azure-devops:syncTask`, `azure-devops:syncAllImportedTasks`, `azure-devops:getReportData`, `azure-devops:getDashboardMetrics`, `azure-devops:exportPdf`
    - _Requisitos: 1.8_

- [x] 11. Reestruturar navegação e rotas do frontend
  - [x] 11.1 Atualizar `panel.routes.tsx`
    - Remover rotas: `/panel/gantt`, `/panel/azure-devops-reports`
    - Remover do `GENERAL_SECTION`: itens "Gantt" e "Relatórios Azure DevOps"
    - Manter 5 itens no menu: Dashboard, Alocação de Equipes, Gestão de Tarefas, Sprints e Tarefas, Sistema
    - _Requisitos: 7.1, 7.2, 7.3_

  - [x] 11.2 Atualizar página `SystemSettings` para exibir apenas 4 cards
    - Manter cards: Cargos, Equipes, Membros, Azure DevOps
    - Remover cards: Alocação em Equipes, Sprints, Tarefas, Alocações
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.4_

- [x] 12. Implementar frontend do Dashboard com 3 abas e Gantt integrado
  - [x] 12.1 Criar sistema de abas no Dashboard
    - Adicionar tabs: Alocação, Tarefas, Sprints
    - Cada aba renderiza componente de dashboard específico
    - Chamar channels IPC correspondentes para buscar dados
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 12.2 Integrar componente Gantt ao Dashboard
    - Mover componente Gantt existente para dentro do Dashboard (aba Alocação ou aba separada)
    - Remover página separada de Gantt
    - _Requisitos: 3.4_

  - [x] 12.3 Integrar dados de relatórios Azure DevOps nos dashboards
    - Distribuir dados de relatórios nos dashboards por contexto
    - Usar exclusivamente dados do Banco_Local
    - Exibir aviso quando configuração Azure DevOps não está definida
    - _Requisitos: 3.5, 3.6_

- [x] 13. Implementar frontend de Gestão de Tarefas (somente leitura)
  - [x] 13.1 Tornar tela de Gestão de Tarefas somente leitura
    - Remover botões/formulários de criação de tarefas
    - Remover funcionalidade de alocação manual de membros em tarefas
    - Exibir campo `assignedToName` como informação somente leitura
    - Manter layout Kanban existente
    - Adicionar indicador visual de "somente leitura" nos cards
    - Exibir mensagem ao tentar editar: "Este dado é gerenciado no Azure DevOps"
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 11.3, 11.6_

- [x] 14. Implementar frontend de Sprints e Tarefas (somente leitura)
  - [x] 14.1 Tornar tela de Sprints e Tarefas somente leitura
    - Remover botões de criação/edição de sprints e tarefas
    - Manter visualização de tarefas agrupadas por sprint
    - Reutilizar componente de tabela da Gestão de Tarefas
    - Adicionar filtro por sprint
    - Indicador visual de somente leitura
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 11.4_

- [x] 15. Implementar frontend de Alocação de Equipes (alterações)
  - [x] 15.1 Atualizar formulário de Alocação de Equipes
    - Remover campo de percentual de dedicação do formulário
    - Tornar campo "Motivo" (notes) obrigatório no formulário com validação
    - Adicionar exibição de alertas de conflito de alocação (chamar `allocation:detectConflicts`)
    - Exibir mensagem de erro ao tentar alocar membro já alocado em outra equipe
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 9.1, 9.3_

- [x] 16. Remover componentes e rotas deprecados
  - [x] 16.1 Remover componentes e arquivos não utilizados
    - Remover página/componente Gantt standalone (se existir como página separada)
    - Remover página/componente Relatórios Azure DevOps
    - Limpar imports e referências órfãs
    - _Requisitos: 7.2, 7.3_

- [x] 17. Checkpoint final — Verificar integração completa
  - Garantir que todos os testes passam, navegação funciona com 5 itens, Sistema exibe 4 cards, dados sincronizados são somente leitura, alocação valida cross-team e dashboards exibem dados corretos. Perguntar ao usuário se há dúvidas.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade usam fast-check com mínimo de 100 iterações
- Pretty-printers existem APENAS no código de teste (o Hub é somente leitura)
- A integração com Azure DevOps é exclusivamente de LEITURA — o Hub nunca envia dados
