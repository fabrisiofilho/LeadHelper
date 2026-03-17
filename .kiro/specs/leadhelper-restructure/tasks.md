# Tarefas de Implementação — Reestruturação do LeadHelper

## Tarefa 1: Módulo de Cálculo de Horas Úteis

- [x] 1.1 Criar `src/main/infrastructure/utils/business-hours.ts` com as funções `isBusinessDay`, `isBusinessHour`, `nextBusinessHourStart`, `calculateBusinessHours` e `addBusinessHours`
- [x] 1.2 Criar constantes `SLA_LIMITS` em `src/shared/interfaces/config/index.types.ts` com mapeamento de prioridade para horas úteis (critical=4, high=8, medium=24, low=40)
- [x] 1.3 Criar testes unitários em `src/main/application/services/__tests__/business-hours.test.ts` com exemplos específicos e edge cases (fim de semana, almoço, fora do horário)
- [x] 1.4 Criar testes de propriedade em `src/main/application/services/__tests__/business-hours.property.test.ts` para Propriedades 4 e 5 (cálculo de horas úteis e round-trip) usando fast-check com mínimo 100 iterações
  - [x] 1.4.1 ⚙️ PBT: Propriedade 4 — Para quaisquer duas datas, calculateBusinessHours conta apenas tempo em horário útil (seg-sex, 08-12, 13:30-17:30)
  - [x] 1.4.2 ⚙️ PBT: Propriedade 5 — Para qualquer data e horas positivas, calculateBusinessHours(start, addBusinessHours(start, h)) === h

## Tarefa 2: Correção da Sincronização de Sprints

- [x] 2.1 Revisar e ajustar `SyncService.resolveSprintByIterationPath` para garantir que sprints são sincronizadas antes dos work items e que logs de aviso são emitidos para paths não resolvidos
- [x] 2.2 Revisar `SyncService.resolveTeamByAreaPath` para garantir resolução correta por prefixo mais longo do Area_Path
- [x] 2.3 Ajustar `SyncService.upsertTask` para tratar falhas individuais sem interromper a sincronização dos demais itens, registrando erros e reportando total de falhas
- [x] 2.4 Criar testes de propriedade em `src/main/application/services/__tests__/sync-service.property.test.ts` para Propriedades 1 e 2 usando fast-check
  - [x] 2.4.1 ⚙️ PBT: Propriedade 1 — Para qualquer work item e conjunto de sprints, resolveSprintByIterationPath retorna a sprint com prefixo mais longo correspondente
  - [x] 2.4.2 ⚙️ PBT: Propriedade 2 — Para qualquer work item e conjunto de times, resolveTeamByAreaPath retorna o time com prefixo mais longo correspondente

## Tarefa 3: Histórico de Atualizações de Cards

- [x] 3.1 Criar entidade `TaskUpdateEntity` em `src/main/application/entities/task-update.entity.ts` com campos: id, taskId, externalWorkItemId, revision, changedDate, changedBy, fieldName, oldValue, newValue
- [x] 3.2 Criar `TaskUpdateRepository` em `src/main/application/repositories/task-update-repository.ts` com métodos findByTaskId e upsert
- [x] 3.3 Adicionar interface `WorkItemUpdate` em `src/shared/interfaces/config/index.types.ts`
- [x] 3.4 Adicionar método `fetchWorkItemUpdates(workItemId: number)` no `AzureDevOpsService` para consultar a API de Updates do Azure DevOps
- [x] 3.5 Adicionar método `syncTaskUpdates` no `SyncService` para sincronizar histórico de atualizações durante o fullSync, com tratamento de falha que mantém dados anteriores
- [x] 3.6 Registrar a entidade `TaskUpdateEntity` na configuração do TypeORM (database boot)
- [x] 3.7 Criar testes para Propriedades 9 e 10 (ordenação e round-trip de histórico)
  - [x] 3.7.1 ⚙️ PBT: Propriedade 9 — Para qualquer lista de atualizações, a ordenação por changedDate deve ser decrescente
  - [x] 3.7.2 ⚙️ PBT: Propriedade 10 — Para qualquer conjunto de atualizações, armazenar e recuperar produz registros equivalentes

## Tarefa 4: Dashboard de Sustentação

- [x] 4.1 Criar interface `SustentacaoItemWithSLA` em `src/shared/interfaces/config/index.types.ts` estendendo `SustentacaoItem` com campos de SLA (businessHoursElapsed, slaLimit, slaPercentage, slaViolated, slaWarning)
- [x] 4.2 Atualizar `DashboardService.getSustentacaoItems` para calcular horas úteis decorridas e status de SLA usando o módulo `business-hours.ts`
- [x] 4.3 Adicionar método no `DashboardService` para obter membros da equipe de Sustentação com seus cards em andamento
- [x] 4.4 Criar página `src/renderer/src/pages/DashboardSustentacao/index.tsx` com lista de membros, cards em andamento, indicadores de SLA e dias sem atualização
- [x] 4.5 Criar componente `CardHistoryDialog` em `src/renderer/src/components/CardHistoryDialog/index.tsx` para exibir histórico de atualizações de um card
- [x] 4.6 Adicionar IPC handler para buscar histórico de atualizações de um card no `DashboardController`
- [x] 4.7 Criar testes de propriedade para Propriedades 3 e 6
  - [x] 4.7.1 ⚙️ PBT: Propriedade 3 — Para qualquer conjunto de cards e prefixo de areaPath, a filtragem retorna exatamente os cards correspondentes
  - [x] 4.7.2 ⚙️ PBT: Propriedade 6 — Para qualquer prioridade e tempo decorrido, o status de SLA é corretamente determinado

## Tarefa 5: Dashboard de Projetos

- [x] 5.1 Atualizar `DashboardService` para identificar sprint atual por datas (startDate <= hoje <= endDate) por time
- [x] 5.2 Atualizar `DashboardService.getProjetosItems` para agrupar cards por status e calcular resumo quantitativo (total, concluídos, em andamento, pendentes, percentual)
- [x] 5.3 Adicionar lógica de alertas no `DashboardService`: itens pendentes e estagnados quando faltam ≤5 dias úteis para fim da sprint
- [x] 5.4 Criar página `src/renderer/src/pages/DashboardProjetos/index.tsx` com visão de sprint atual, cards agrupados por status, alertas e resumo quantitativo
- [x] 5.5 Criar testes de propriedade para Propriedades 7 e 8
  - [x] 5.5.1 ⚙️ PBT: Propriedade 7 — Para qualquer conjunto de sprints e data de referência, a sprint atual é corretamente identificada
  - [x] 5.5.2 ⚙️ PBT: Propriedade 8 — Para qualquer sprint com cards, o resumo quantitativo satisfaz total = soma dos status e percentual = completed/total

## Tarefa 6: Reestruturação da Navegação

- [x] 6.1 Atualizar `panel.routes.tsx`: substituir entrada "Dashboard" por "Dashboard Sustentação" (rota `/panel/dashboard-sustentacao`) e "Dashboard Projetos" (rota `/panel/dashboard-projetos`)
- [x] 6.2 Remover entrada "Relatórios" do `GENERAL_SECTION` e do `ROUTES_ITEMS` em `panel.routes.tsx`
- [x] 6.3 Configurar redirecionamento padrão para `/panel/dashboard-sustentacao` e redirecionar `/panel/reports` para o dashboard padrão
- [x] 6.4 Remover componente `ReportsPage` da importação em `panel.routes.tsx` (manter arquivo `report-exporter.ts`)
- [x] 6.5 Remover abas antigas do dashboard (Visão Geral, Performance, Alertas) que não se aplicam à nova estrutura

## Tarefa 7: Aba Gantt na Tela de Alocação

- [x] 7.1 Modificar `TeamAllocationPage` para incluir MUI `Tabs` com duas abas: "Gestão de Alocações" e "Gráfico Gantt"
- [x] 7.2 Mover conteúdo atual da `TeamAllocationPage` para a aba "Gestão de Alocações"
- [x] 7.3 Criar componente de aba Gantt que utiliza o `GanttService` existente, com filtros por equipe e período, e tratamento de alocações sem data de fim (usar 31/12/2099)
- [x] 7.4 Criar testes de propriedade para Propriedade 11
  - [x] 7.4.1 ⚙️ PBT: Propriedade 11 — Para qualquer conjunto de alocações e filtros, os itens do Gantt correspondem exatamente às alocações filtradas com datas corretas

## Tarefa 8: Limpeza e Verificação Final

- [x] 8.1 Remover arquivos da página de Relatórios (`src/renderer/src/pages/Reports/index.tsx` e `styles.ts`) mantendo `report-exporter.ts`
- [x] 8.2 Verificar que todas as rotas de configuração (Equipes, Membros, Cargos, Azure DevOps, Sistema) permanecem acessíveis
- [x] 8.3 Verificar que a sincronização completa (sprints, times, membros, tarefas) funciona corretamente após as alterações
- [x] 8.4 Executar todos os testes existentes e novos para garantir que nada foi quebrado
