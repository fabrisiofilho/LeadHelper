# Plano de Implementação: Azure DevOps Integration V2

## Visão Geral

Implementação incremental das melhorias na integração Azure DevOps: enriquecimento de dados, mapeamento de tipos, filtro por iteration, relatórios com gráficos, exportação CSV/PDF, dashboard de métricas e alinhamento de layout. Cada tarefa constrói sobre a anterior, começando pela camada de dados e subindo até o frontend.

## Tarefas

- [x] 1. Migração de banco de dados e atualização da entidade TaskEntity
  - [x] 1.1 Criar migração 007 para enriquecimento Azure DevOps
    - Criar arquivo `src/main/infrastructure/database/migrations/007_azure_devops_enrichment.sql`
    - Adicionar colunas: `area_path TEXT`, `iteration_path TEXT`, `tags TEXT`, `story_points REAL`, `original_work_item_type TEXT` (todas nullable)
    - _Requirements: 1.4_
  - [x] 1.2 Adicionar novos campos na TaskEntity
    - Editar `src/main/application/entities/task.entity.ts`
    - Adicionar colunas TypeORM: `areaPath`, `iterationPath`, `tags`, `storyPoints`, `originalWorkItemType` com `nullable: true`
    - _Requirements: 1.3_
  - [x] 1.3 Atualizar interface Task nos shared types
    - Editar `src/shared/interfaces/config/index.types.ts`
    - Adicionar campos opcionais: `areaPath?`, `iterationPath?`, `tags?`, `storyPoints?`, `originalWorkItemType?` na interface Task
    - _Requirements: 1.2_

- [x] 2. Tipos compartilhados e interfaces enriquecidas
  - [x] 2.1 Adicionar interfaces enriquecidas nos shared types
    - Editar `src/shared/interfaces/config/index.types.ts`
    - Enriquecer interface `WorkItem` com campos: `projectName`, `areaPath`, `iterationPath`, `tags`, `storyPoints`, `priority`, `originalWorkItemType`
    - Adicionar propriedade opcional `iterationPath` em `WorkItemFilters`
    - Adicionar interfaces: `IterationNode`, `ReportData`, `ReportItem`, `DashboardMetrics`, `ReportPeriod`, `ExportResult`
    - _Requirements: 1.2, 3.1, 4.8, 6.6_

- [x] 3. Módulo Type Mapper
  - [x] 3.1 Criar módulo work-item-type-mapper
    - Criar `src/main/application/services/work-item-type-mapper.ts`
    - Implementar função pura `mapWorkItemType(azureType: string): TaskType`
    - Mapeamento: Feature→feature, Bug→bug, Task→task, Improvement→improvement, User Story→feature, Product Backlog Item→task
    - Comparação case-insensitive, fallback para `'task'`
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ]* 3.2 Escrever teste de propriedade para fallback de tipo desconhecido
    - **Property 3: Tipo desconhecido resulta em fallback "task"**
    - **Validates: Requirements 2.2**
  - [ ]* 3.3 Escrever teste de propriedade para case-insensitive
    - **Property 4: Mapeamento de tipo é case-insensitive**
    - **Validates: Requirements 2.5**

- [x] 4. Checkpoint — Validar camada de dados
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Service — Enriquecimento da importação e filtro por iteration
  - [x] 5.1 Alterar fetchWorkItemDetails para incluir campos enriquecidos
    - Editar `src/main/application/services/azure-devops-service.ts`
    - Adicionar `System.AreaPath`, `System.IterationPath`, `System.Tags`, `Microsoft.VSTS.Scheduling.StoryPoints`, `Microsoft.VSTS.Common.Priority`, `System.WorkItemType` no parâmetro `fields` da requisição de detalhes
    - Mapear resposta para `WorkItem` enriquecido, tratando campos nulos/ausentes como `null`
    - _Requirements: 1.1, 1.6_
  - [ ]* 5.2 Escrever teste de propriedade para campos na URL de detalhes
    - **Property 2: Requisição de detalhes inclui campos enriquecidos**
    - **Validates: Requirements 1.1**
  - [x] 5.3 Alterar importWorkItems para usar TypeMapper e persistir campos enriquecidos
    - Editar `src/main/application/services/azure-devops-service.ts`
    - Importar e usar `mapWorkItemType()` para definir `type` da TaskEntity
    - Persistir `areaPath`, `iterationPath`, `tags`, `storyPoints`, `originalWorkItemType` na entidade
    - _Requirements: 1.3, 2.3, 2.4_
  - [x] 5.4 Alterar syncTask para atualizar campos enriquecidos
    - Editar `src/main/application/services/azure-devops-service.ts`
    - Na sincronização, atualizar campos enriquecidos com valores atuais da API
    - _Requirements: 1.5_
  - [ ]* 5.5 Escrever teste de propriedade para round-trip de enriquecimento
    - **Property 1: Round-trip de enriquecimento na importação e sincronização**
    - **Validates: Requirements 1.3, 1.5, 1.6, 2.3, 2.4**
  - [x] 5.6 Adicionar filtro iterationPath na consulta WIQL
    - Editar `src/main/application/services/azure-devops-service.ts` no método `fetchWorkItems`
    - Quando `filters.iterationPath` fornecido, adicionar cláusula `[System.IterationPath] UNDER '{iterationPath}'` na query WIQL
    - _Requirements: 3.2_
  - [ ]* 5.7 Escrever teste de propriedade para cláusula WIQL de iteration
    - **Property 5: Cláusula WIQL de iteration path**
    - **Validates: Requirements 3.2**
  - [x] 5.8 Implementar método fetchIterations
    - Editar `src/main/application/services/azure-devops-service.ts`
    - Consultar API `{org}/{project}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0`
    - Retornar árvore de `IterationNode[]` com mapeamento recursivo
    - Em caso de erro, retornar `[]` e logar erro
    - _Requirements: 3.3, 3.4, 3.6_
  - [ ]* 5.9 Escrever teste de propriedade para parsing da árvore de iterations
    - **Property 6: Parsing da árvore de iterations**
    - **Validates: Requirements 3.4**

- [x] 6. Checkpoint — Validar service enriquecido
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Service — Relatórios e Dashboard
  - [x] 7.1 Implementar método getReportData
    - Editar `src/main/application/services/azure-devops-service.ts`
    - Query SQL agregando tasks importadas (origin = 'azure_devops') por tipo, status, assignee e projeto no período
    - Retornar `ReportData` com totalItems, byType, byStatus, byAssignee, byProject e items
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [ ]* 7.2 Escrever teste de propriedade para invariante de agrupamento
    - **Property 7: Invariante de agrupamento nos relatórios**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 6.2, 6.5**
  - [x] 7.3 Implementar método getDashboardMetrics
    - Editar `src/main/application/services/azure-devops-service.ts`
    - Query SQL para: total importado, última sincronização, pendentes de sync (changedDate > updatedAt), distribuição por status
    - Retornar `DashboardMetrics`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 7.4 Escrever teste de propriedade para contagem de pendentes
    - **Property 10: Contagem de pendentes de sincronização**
    - **Validates: Requirements 6.4**

- [x] 8. Report Exporter — CSV e PDF
  - [x] 8.1 Criar módulo ReportExporter
    - Criar `src/main/application/services/report-exporter.ts`
    - Implementar `exportCsv(items, period)`: gerar CSV com colunas (ID, Título, Tipo, Tipo Original, Estado, Responsável, Projeto, Area Path, Iteration Path, Tags, Story Points, Data de Criação, Data de Atualização), usar `dialog.showSaveDialog`, retornar `ExportResult`
    - Implementar `exportPdf(items, period)`: gerar PDF com jsPDF + jspdf-autotable, título com período, tabela com mesmos dados, usar `dialog.showSaveDialog`, retornar `ExportResult`
    - Tratar cancelamento do dialog (retornar `{ success: false }` sem erro)
    - _Requirements: 5.2, 5.3, 5.4, 5.5_
  - [ ]* 8.2 Escrever teste de propriedade para colunas do CSV
    - **Property 8: CSV contém todas as colunas obrigatórias**
    - **Validates: Requirements 5.2**
  - [ ]* 8.3 Escrever teste de propriedade para correspondência export/report
    - **Property 9: Dados exportados correspondem aos dados do relatório**
    - **Validates: Requirements 5.7**

- [x] 9. Controller — Novos métodos IPC
  - [x] 9.1 Adicionar métodos IPC no AzureDevOpsController
    - Editar `src/main/application/controllers/azure-devops-controller.ts`
    - Adicionar métodos com decorator IPC: `fetchIterations`, `getReportData(period)`, `getDashboardMetrics`, `exportCsv(period)`, `exportPdf(period)`
    - Cada método retorna `ApiResponse<T>` com try-catch e tratamento de erro
    - _Requirements: 3.3, 4.8, 6.6_
  - [x] 9.2 Registrar novos métodos no preload controller-config
    - Editar `src/preload/controller-config.ts`
    - Adicionar `'fetchIterations'`, `'getReportData'`, `'getDashboardMetrics'`, `'exportCsv'`, `'exportPdf'` no array de métodos do `azureDevOps`
    - _Requirements: 3.3, 4.8, 6.6_

- [x] 10. Checkpoint — Validar backend completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Frontend — Hook e componentes base
  - [x] 11.1 Atualizar hook useAzureDevOps com novos métodos
    - Editar `src/renderer/src/hooks/useAzureDevOps.ts`
    - Adicionar funções: `fetchIterations`, `getReportData`, `getDashboardMetrics`, `exportCsv`, `exportPdf`
    - _Requirements: 3.3, 4.8, 6.6_
  - [x] 11.2 Criar componente IterationSelector
    - Criar `src/renderer/src/components/IterationSelector/index.tsx`
    - Componente MUI Autocomplete com árvore de iterations
    - Carregar iterations via `fetchIterations` ao montar
    - _Requirements: 3.5_
  - [x] 11.3 Criar componente DashboardSection
    - Criar `src/renderer/src/components/DashboardSection/index.tsx`
    - Cards: total importado, última sincronização, pendentes de sync, distribuição por status
    - Usar surface background, border-radius 1rem, box-shadow do tema
    - Carregar métricas via `getDashboardMetrics` ao montar
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_

- [x] 12. Frontend — Refatoração da AzureDevOpsConfigPage
  - [x] 12.1 Integrar DashboardSection e IterationSelector na página
    - Editar `src/renderer/src/pages/AzureDevOpsConfig/`
    - Adicionar `DashboardSection` antes das abas existentes
    - Adicionar `IterationSelector` na aba "Explorar Work Items"
    - _Requirements: 6.1, 3.5_
  - [x] 12.2 Alinhar layout com padrão do sistema
    - Usar `PageContainer` com padding/max-width/background padrão
    - Usar `SortableTableCell` + `useTableSort` nas tabelas de work items e tarefas importadas
    - Usar `Modal` com `variant="form"` para diálogos de confirmação
    - Adicionar empty state quando config não definida (ícone, mensagem, botão de ação)
    - Adicionar loading skeletons consistentes durante operações assíncronas
    - Manter todos os textos em português (Brasil)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 13. Frontend — Página de Relatórios Azure DevOps
  - [x] 13.1 Criar AzureDevOpsReportsPage
    - Criar `src/renderer/src/pages/AzureDevOpsReports/index.tsx`
    - Filtro de período: presets (7, 15, 30, 60, 90 dias) + personalizado com DatePicker
    - Exibir contagem total de work items no período
    - Gráfico de barras por tipo (Recharts BarChart)
    - Gráfico de barras por status (Recharts BarChart)
    - Tabela por assignee com SortableTableCell
    - Tabela por projeto com SortableTableCell
    - Botões "Exportar CSV" e "Exportar PDF" na área de ações
    - Usar PageContainer, tema dark Spotify-style, componentes MUI
    - Notificação de sucesso após exportação com caminho do arquivo
    - Mensagem "Nenhum dado encontrado" quando sem dados
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9, 5.1, 5.6, 5.7_

- [x] 14. Navegação — Adicionar rota de relatórios
  - [x] 14.1 Registrar rota e item no menu lateral
    - Editar `src/renderer/src/routes/panel.routes.tsx`
    - Adicionar rota `/panel/azure-devops-reports` apontando para `AzureDevOpsReportsPage`
    - Adicionar item "Relatórios Azure DevOps" no menu lateral, seção Geral, com ícone `AssessmentOutlinedIcon`
    - _Requirements: 4.1_

- [x] 15. Checkpoint final — Validar integração completa
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam propriedades universais de corretude com fast-check
- Testes unitários validam exemplos específicos e edge cases
- Linguagem de implementação: TypeScript (conforme design)
