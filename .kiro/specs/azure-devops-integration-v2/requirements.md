# Documento de Requisitos — Azure DevOps Integration V2

## Introdução

Melhoria abrangente da integração com Azure DevOps no aplicativo desktop LeadHelper/TeamFlow (Electron + React). O objetivo é enriquecer os dados importados, adicionar relatórios e dashboards, permitir filtros por iteration/sprint, exportar relatórios e alinhar o layout da página de integração com o padrão visual do restante do sistema.

## Glossário

- **Sistema**: O aplicativo desktop LeadHelper/TeamFlow (Electron + React + TypeScript)
- **Serviço_AzureDevOps**: Módulo backend (`azure-devops-service.ts`) responsável pela comunicação com a API REST do Azure DevOps
- **WorkItem**: Objeto retornado pela API do Azure DevOps representando um item de trabalho (Task, Bug, Feature, etc.)
- **WorkItem_Enriquecido**: WorkItem com campos adicionais: projectName, areaPath, iterationPath, tags, storyPoints, priority, originalWorkItemType
- **Tarefa_Local**: Entidade `TaskEntity` no banco SQLite local que armazena tarefas do sistema
- **Mapeador_Tipo**: Componente que converte o tipo do WorkItem do Azure DevOps para o TaskType local
- **Tela_Relatórios**: Página frontend dedicada a exibir relatórios de work items importados com gráficos e filtros
- **Dashboard_Integração**: Seção com cards de métricas sobre o estado da integração (total importado, última sincronização, etc.)
- **Exportador_Relatório**: Componente que gera arquivos CSV ou PDF a partir dos dados filtrados de work items
- **Tela_Integração**: Página principal de integração Azure DevOps (`AzureDevOpsConfigPage`)
- **Filtro_Iteration**: Filtro que permite selecionar uma iteration path ou sprint específica do Azure DevOps na consulta WIQL
- **Controlador_AzureDevOps**: Controller IPC (`azure-devops-controller.ts`) que expõe métodos do backend para o frontend via IPC

## Requisitos

### Requisito 1: Preservar dados completos do Azure DevOps na importação

**User Story:** Como gestor de equipe, eu quero que todos os campos relevantes do Azure DevOps sejam preservados ao importar work items, para que eu tenha visibilidade completa dos dados originais sem precisar consultar o Azure DevOps.

#### Critérios de Aceitação

1. WHEN um WorkItem é buscado da API do Azure DevOps, THE Serviço_AzureDevOps SHALL incluir os campos: System.AreaPath, System.IterationPath, System.Tags, Microsoft.VSTS.Scheduling.StoryPoints, Microsoft.VSTS.Common.Priority e System.WorkItemType na requisição de detalhes
2. THE WorkItem_Enriquecido SHALL conter as propriedades: projectName (string), areaPath (string), iterationPath (string), tags (string), storyPoints (number ou undefined), priority (number ou undefined) e originalWorkItemType (string)
3. WHEN um WorkItem é importado como Tarefa_Local, THE Serviço_AzureDevOps SHALL persistir os campos areaPath, iterationPath, tags, storyPoints e originalWorkItemType na entidade TaskEntity
4. THE Sistema SHALL criar uma migração de banco de dados (007) adicionando as colunas: area_path (TEXT, nullable), iteration_path (TEXT, nullable), tags (TEXT, nullable), story_points (REAL, nullable) e original_work_item_type (TEXT, nullable) na tabela tasks
5. WHEN um WorkItem já importado é sincronizado novamente, THE Serviço_AzureDevOps SHALL atualizar os campos enriquecidos (areaPath, iterationPath, tags, storyPoints, originalWorkItemType) com os valores atuais do Azure DevOps
6. IF a API do Azure DevOps retornar um campo enriquecido como nulo ou ausente, THEN THE Serviço_AzureDevOps SHALL armazenar o valor como nulo na Tarefa_Local sem gerar erro

### Requisito 2: Mapear tipo do work item para tipo local

**User Story:** Como gestor de equipe, eu quero que o tipo do work item do Azure DevOps seja automaticamente mapeado para o tipo local correspondente, para que as tarefas importadas já estejam categorizadas corretamente.

#### Critérios de Aceitação

1. THE Mapeador_Tipo SHALL converter os seguintes tipos do Azure DevOps para TaskType local: "Feature" para "feature", "Bug" para "bug", "Task" para "task", "Improvement" para "improvement", "User Story" para "feature", "Product Backlog Item" para "task"
2. WHEN o tipo do WorkItem do Azure DevOps não possui mapeamento definido, THE Mapeador_Tipo SHALL utilizar o valor "task" como tipo padrão
3. WHEN um WorkItem é importado, THE Serviço_AzureDevOps SHALL utilizar o Mapeador_Tipo para definir o campo type da Tarefa_Local
4. WHEN um WorkItem é importado, THE Serviço_AzureDevOps SHALL preservar o tipo original do Azure DevOps no campo originalWorkItemType da Tarefa_Local
5. THE Mapeador_Tipo SHALL realizar a comparação de tipos de forma case-insensitive

### Requisito 3: Filtro por Iteration Path / Sprint

**User Story:** Como gestor de equipe, eu quero filtrar work items por iteration path ou sprint do Azure DevOps, para que eu possa importar apenas os itens de uma sprint específica.

#### Critérios de Aceitação

1. THE WorkItemFilters SHALL incluir uma propriedade opcional iterationPath do tipo string
2. WHEN o filtro iterationPath é fornecido, THE Serviço_AzureDevOps SHALL adicionar a cláusula `[System.IterationPath] UNDER '{iterationPath}'` na consulta WIQL
3. THE Controlador_AzureDevOps SHALL expor um novo método IPC `azure-devops:fetchIterations` que retorna a lista de iteration paths disponíveis no projeto configurado
4. WHEN o método fetchIterations é chamado, THE Serviço_AzureDevOps SHALL consultar a API `{org}/{project}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0` e retornar a árvore de iterations
5. THE Tela_Integração SHALL exibir um seletor de iteration path na aba "Explorar Work Items" permitindo ao usuário escolher uma iteration antes de buscar work items
6. IF a API do Azure DevOps retornar erro ao buscar iterations, THEN THE Serviço_AzureDevOps SHALL retornar uma lista vazia e registrar o erro no log

### Requisito 4: Tela de Relatórios Azure DevOps

**User Story:** Como gestor de equipe, eu quero visualizar relatórios dos work items importados com gráficos e filtros por período, para que eu possa acompanhar métricas e tendências da integração.

#### Critérios de Aceitação

1. THE Sistema SHALL disponibilizar uma nova página "Relatórios Azure DevOps" acessível via menu lateral de navegação
2. THE Tela_Relatórios SHALL exibir um filtro de período (últimos 7, 15, 30, 60, 90 dias ou período personalizado) que controla os dados exibidos
3. WHEN um período é selecionado, THE Tela_Relatórios SHALL exibir a contagem total de work items importados no período selecionado
4. THE Tela_Relatórios SHALL exibir um gráfico de barras agrupando work items importados por tipo (Feature, Bug, Task, Improvement, etc.)
5. THE Tela_Relatórios SHALL exibir um gráfico de barras agrupando work items importados por estado (status local: pending, in_progress, completed, cancelled)
6. THE Tela_Relatórios SHALL exibir uma tabela agrupando work items importados por assignee (responsável), mostrando nome e quantidade
7. THE Tela_Relatórios SHALL exibir uma tabela agrupando work items importados por projeto (projectName) quando disponível
8. THE Controlador_AzureDevOps SHALL expor um método IPC `azure-devops:getReportData` que recebe um período (startDate, endDate) e retorna os dados agregados para os relatórios
9. THE Tela_Relatórios SHALL seguir o padrão visual do sistema utilizando PageContainer, tema dark Spotify-style e componentes MUI consistentes com as demais páginas

### Requisito 5: Exportar relatório

**User Story:** Como gestor de equipe, eu quero exportar os dados filtrados dos relatórios em formato CSV ou PDF, para que eu possa compartilhar as informações com stakeholders.

#### Critérios de Aceitação

1. THE Tela_Relatórios SHALL exibir botões "Exportar CSV" e "Exportar PDF" na área de ações
2. WHEN o usuário clica em "Exportar CSV", THE Exportador_Relatório SHALL gerar um arquivo CSV contendo as colunas: ID, Título, Tipo, Tipo Original, Estado, Responsável, Projeto, Area Path, Iteration Path, Tags, Story Points, Data de Criação, Data de Atualização
3. WHEN o usuário clica em "Exportar PDF", THE Exportador_Relatório SHALL gerar um arquivo PDF contendo uma tabela com os mesmos dados do CSV e o título do relatório com o período selecionado
4. WHEN o arquivo é gerado, THE Sistema SHALL abrir o diálogo nativo do sistema operacional (Electron dialog.showSaveDialog) para o usuário escolher o local de salvamento
5. IF o usuário cancelar o diálogo de salvamento, THEN THE Sistema SHALL cancelar a operação de exportação sem exibir erro
6. WHEN a exportação é concluída com sucesso, THE Sistema SHALL exibir uma notificação de sucesso informando o caminho do arquivo salvo
7. THE Exportador_Relatório SHALL aplicar os mesmos filtros de período ativos na Tela_Relatórios ao gerar o arquivo exportado

### Requisito 6: Dashboard de integração

**User Story:** Como gestor de equipe, eu quero visualizar um dashboard com métricas resumidas da integração Azure DevOps, para que eu tenha uma visão rápida do estado atual da integração.

#### Critérios de Aceitação

1. THE Dashboard_Integração SHALL ser exibido na Tela_Integração como uma seção visível antes das abas existentes
2. THE Dashboard_Integração SHALL exibir um card com o total de tarefas importadas do Azure DevOps
3. THE Dashboard_Integração SHALL exibir um card com a data e hora da última sincronização realizada
4. THE Dashboard_Integração SHALL exibir um card com a quantidade de tarefas pendentes de sincronização (tarefas importadas cujo changedDate no Azure DevOps é posterior à última sincronização local)
5. THE Dashboard_Integração SHALL exibir um card com a distribuição de tarefas importadas por status (pending, in_progress, completed, cancelled)
6. THE Controlador_AzureDevOps SHALL expor um método IPC `azure-devops:getDashboardMetrics` que retorna os dados agregados para o dashboard
7. WHEN o usuário acessa a Tela_Integração, THE Dashboard_Integração SHALL carregar as métricas automaticamente
8. THE Dashboard_Integração SHALL seguir o padrão visual de cards do sistema utilizando surface background, border-radius de 1rem e box-shadow consistente com o tema

### Requisito 7: Melhorar layout da Tela de Integração Azure DevOps

**User Story:** Como usuário do sistema, eu quero que a tela de integração Azure DevOps tenha um layout consistente com as demais páginas do sistema, para que a experiência de uso seja uniforme e otimizada para o fluxo de trabalho diário.

#### Critérios de Aceitação

1. THE Tela_Integração SHALL utilizar o componente PageContainer com o mesmo padrão de padding, max-width e background das demais páginas do sistema
2. THE Tela_Integração SHALL exibir o cabeçalho da página com título, descrição e ações no mesmo padrão visual das páginas de Equipes, Sprints e Membros
3. THE Tela_Integração SHALL utilizar o componente SortableTableCell e o hook useTableSort nas tabelas de work items e tarefas importadas
4. THE Tela_Integração SHALL utilizar o componente Modal com variant="form" para diálogos de confirmação e formulários
5. THE Tela_Integração SHALL manter todos os textos em português (Brasil)
6. THE Tela_Integração SHALL exibir estados de carregamento (loading skeleton ou spinner) durante operações assíncronas de forma consistente com o restante do sistema
7. WHEN a configuração do Azure DevOps não está definida, THE Tela_Integração SHALL exibir um estado vazio (empty state) com ícone, mensagem orientativa e botão de ação para configurar
