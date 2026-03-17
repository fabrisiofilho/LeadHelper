# Documento de Requisitos — Reestruturação do LeadHelper

## Introdução

Este documento descreve os requisitos para a reestruturação completa do aplicativo LeadHelper, uma aplicação Electron (electron-vite) com React, TypeScript, MUI, Redux e SQLite (better-sqlite3) utilizada por Tech Leads para gestão de equipes. A reestruturação envolve: correção da integração com Azure DevOps (migração de dados para Sprints), consolidação dos dashboards em dois (Sustentação e Projetos), adição de visualização de histórico de atualizações de cards, inclusão de aba Gantt na tela de Alocação de Equipes, e remoção da tela de Relatórios.

## Glossário

- **Sistema_LeadHelper**: Aplicação desktop Electron para gestão de equipes de desenvolvimento.
- **Serviço_Sync**: Módulo backend (SyncService) responsável por sincronizar dados do Azure DevOps com o banco SQLite local.
- **Serviço_AzureDevOps**: Módulo backend (AzureDevOpsService) que se comunica com a API REST do Azure DevOps.
- **Dashboard_Sustentação**: Painel de controle para a área "Tribo SEIF\Sustentação", focado em demandas de sustentação com controle de SLA.
- **Dashboard_Projetos**: Painel de controle para a área "Tribo SEIF\Projetos", focado em sprints e progresso de itens de projeto.
- **Tela_Alocação**: Tela de gerenciamento de alocação de membros em equipes, com abas de gestão e Gantt.
- **Componente_Gantt**: Componente de visualização de cronograma no formato gráfico de Gantt.
- **SLA_Sustentação**: Acordo de nível de serviço para conclusão de tarefas de sustentação, medido em horas úteis.
- **Horário_Útil**: Período de trabalho definido como 08h00–12h00 e 13h30–17h30, totalizando 8 horas por dia útil.
- **Dia_Útil**: Dia de segunda a sexta-feira, excluindo fins de semana, com 8 horas úteis.
- **Card_Azure**: Work item (Epic, Feature, User Story, Task, Bug) originado do Azure DevOps.
- **Iteration_Path**: Caminho hierárquico de iteração no Azure DevOps que identifica a sprint à qual um work item pertence.
- **Area_Path**: Caminho hierárquico de área no Azure DevOps que identifica o time/projeto ao qual um work item pertence.
- **Item_Estagnado**: Card do Azure DevOps que não recebeu atualização de status por um período configurável.
- **Histórico_Atualizações**: Registro cronológico das alterações de estado e campos de um Card_Azure obtido via API do Azure DevOps.

## Requisitos

### Requisito 1: Correção da Sincronização de Sprints com Azure DevOps

**User Story:** Como Tech Lead, eu quero que os dados do Azure DevOps sejam corretamente migrados para as sprints locais, para que eu possa confiar nos dados exibidos nos dashboards.

#### Critérios de Aceitação

1. WHEN o Serviço_Sync executa a sincronização completa, THE Serviço_Sync SHALL resolver o sprint_id de cada Card_Azure comparando o Iteration_Path do work item com o iterationPath das sprints locais cadastradas.
2. WHEN um Card_Azure possui um Iteration_Path que corresponde exatamente ao iterationPath de uma sprint local, THE Serviço_Sync SHALL associar o Card_Azure à sprint correspondente.
3. WHEN um Card_Azure possui um Iteration_Path hierarquicamente contido no iterationPath de uma sprint local, THE Serviço_Sync SHALL associar o Card_Azure à sprint mais específica (caminho mais longo).
4. WHEN um Card_Azure possui um Iteration_Path que não corresponde a nenhuma sprint local, THE Serviço_Sync SHALL registrar um log de aviso com o Iteration_Path não resolvido e manter o sprint_id como nulo.
5. WHEN o Serviço_Sync sincroniza sprints do Azure DevOps, THE Serviço_Sync SHALL criar ou atualizar sprints locais com nome, datas de início e fim, e iterationPath obtidos da API do Azure DevOps.
6. WHEN o Serviço_Sync sincroniza work items, THE Serviço_Sync SHALL associar cada Card_Azure ao time correto utilizando o Area_Path do work item.
7. IF a sincronização de um Card_Azure individual falhar, THEN THE Serviço_Sync SHALL registrar o erro no log, continuar a sincronização dos demais itens e reportar o total de falhas ao final.

### Requisito 2: Dashboard de Sustentação

**User Story:** Como Tech Lead da área de Sustentação, eu quero um dashboard dedicado que mostre os desenvolvedores alocados, suas demandas em andamento e alertas de SLA, para que eu possa gerenciar a equipe de sustentação de forma eficiente.

#### Critérios de Aceitação

1. THE Dashboard_Sustentação SHALL filtrar e exibir apenas Cards_Azure cujo Area_Path comece com "Tribo SEIF\Sustentação".
2. THE Dashboard_Sustentação SHALL exibir a lista de membros da equipe alocados à área de Sustentação, com nome, cargo e status de atividade.
3. WHEN um membro da equipe de Sustentação possui pelo menos um Card_Azure com status "in_progress" atribuído a ele, THE Dashboard_Sustentação SHALL exibir os cards em andamento ao lado do nome do membro.
4. WHEN um membro da equipe de Sustentação não possui nenhum Card_Azure com status "in_progress" atribuído a ele, THE Dashboard_Sustentação SHALL exibir um alerta visual indicando que o membro está sem tarefas em andamento.
5. THE Dashboard_Sustentação SHALL calcular o tempo decorrido de cada Card_Azure em andamento utilizando exclusivamente Horário_Útil (08h00–12h00 e 13h30–17h30, segunda a sexta).
6. THE Dashboard_Sustentação SHALL aplicar os seguintes limites de SLA_Sustentação por prioridade: Crítica = 4 horas úteis, Alta = 8 horas úteis, Média = 24 horas úteis, Baixa = 40 horas úteis.
7. WHEN o tempo decorrido em Horário_Útil de um Card_Azure em andamento ultrapassar o SLA_Sustentação correspondente à sua prioridade, THE Dashboard_Sustentação SHALL exibir um indicador visual de SLA violado no card.
8. WHEN o tempo decorrido em Horário_Útil de um Card_Azure em andamento atingir 80% do SLA_Sustentação correspondente, THE Dashboard_Sustentação SHALL exibir um indicador visual de alerta de proximidade de violação.

### Requisito 3: Dashboard de Projetos

**User Story:** Como Tech Lead da área de Projetos, eu quero um dashboard dedicado que mostre o progresso dos itens na sprint atual e alertas de itens estagnados, para que eu possa acompanhar o andamento dos projetos.

#### Critérios de Aceitação

1. THE Dashboard_Projetos SHALL filtrar e exibir apenas Cards_Azure cujo Area_Path comece com "Tribo SEIF\Projetos".
2. THE Dashboard_Projetos SHALL identificar e exibir a sprint atual (sprint cuja data de início é anterior ou igual à data atual e cuja data de fim é posterior ou igual à data atual) para cada time da área de Projetos.
3. WHEN uma sprint atual é identificada, THE Dashboard_Projetos SHALL listar todos os Cards_Azure associados à sprint, agrupados por status (pendente, em andamento, concluído, cancelado).
4. WHEN faltarem 5 Dias_Úteis ou menos para o fim da sprint atual e existirem Cards_Azure com status "pending" (sem progresso), THE Dashboard_Projetos SHALL exibir um alerta visual indicando os itens que não progrediram.
5. WHEN faltarem 5 Dias_Úteis ou menos para o fim da sprint atual e existirem Cards_Azure com status "in_progress" que não tiveram atualização nos últimos 2 Dias_Úteis, THE Dashboard_Projetos SHALL exibir um alerta visual indicando os itens potencialmente estagnados.
6. THE Dashboard_Projetos SHALL exibir um resumo quantitativo da sprint atual contendo: total de itens, itens concluídos, itens em andamento, itens pendentes e percentual de conclusão.

### Requisito 4: Histórico de Atualizações de Cards (Funcionalidade Comum)

**User Story:** Como Tech Lead, eu quero visualizar o histórico de atualizações de cada card do Azure DevOps, para que eu possa monitorar cards estagnados e entender a evolução de cada demanda.

#### Critérios de Aceitação

1. WHEN o usuário seleciona um Card_Azure em qualquer dashboard, THE Sistema_LeadHelper SHALL exibir o Histórico_Atualizações do card em ordem cronológica decrescente.
2. WHEN o Serviço_Sync sincroniza um Card_Azure, THE Serviço_Sync SHALL consultar a API de Updates do Azure DevOps para obter o histórico de alterações de campos do work item.
3. THE Sistema_LeadHelper SHALL armazenar localmente o Histórico_Atualizações de cada Card_Azure, incluindo: data da alteração, campo alterado, valor anterior e valor novo.
4. THE Dashboard_Sustentação SHALL exibir um indicador visual em cada Card_Azure mostrando há quantos Dias_Úteis o card não recebe atualização de status.
5. THE Dashboard_Projetos SHALL exibir um indicador visual em cada Card_Azure mostrando há quantos Dias_Úteis o card não recebe atualização de status.
6. IF a consulta ao histórico de atualizações de um Card_Azure falhar na API do Azure DevOps, THEN THE Serviço_Sync SHALL registrar o erro no log e manter o histórico previamente armazenado sem alterações.

### Requisito 5: Reestruturação da Navegação — Dois Dashboards

**User Story:** Como Tech Lead, eu quero que a aplicação tenha apenas dois dashboards principais (Sustentação e Projetos) no menu de navegação, para que a interface seja mais objetiva e focada.

#### Critérios de Aceitação

1. THE Sistema_LeadHelper SHALL exibir no menu de navegação principal duas entradas de dashboard: "Dashboard Sustentação" e "Dashboard Projetos".
2. THE Sistema_LeadHelper SHALL remover a tela de Relatórios (/panel/reports) do menu de navegação e das rotas da aplicação.
3. THE Sistema_LeadHelper SHALL manter as demais telas de configuração (Equipes, Membros, Cargos, Azure DevOps, Sistema) acessíveis pelo menu de navegação.
4. WHEN o usuário acessa a aplicação, THE Sistema_LeadHelper SHALL redirecionar para o Dashboard de Sustentação como tela padrão.
5. THE Sistema_LeadHelper SHALL remover as abas de dashboard anteriores (Visão Geral, Performance da Equipe, Alertas) que não se aplicam à nova estrutura.

### Requisito 6: Tela de Alocação de Equipes com Aba Gantt

**User Story:** Como Tech Lead, eu quero que a tela de Alocação de Equipes tenha duas abas — uma para gestão de alocações e outra para visualização Gantt — para que eu possa gerenciar e visualizar cronogramas no mesmo contexto.

#### Critérios de Aceitação

1. THE Tela_Alocação SHALL exibir duas abas: "Gestão de Alocações" e "Gráfico Gantt".
2. WHEN o usuário seleciona a aba "Gestão de Alocações", THE Tela_Alocação SHALL exibir a funcionalidade atual de gerenciamento de alocações de membros em equipes.
3. WHEN o usuário seleciona a aba "Gráfico Gantt", THE Tela_Alocação SHALL exibir o Componente_Gantt com as alocações dos membros da equipe selecionada.
4. THE Componente_Gantt SHALL exibir barras horizontais representando o período de alocação de cada membro, com data de início e data de fim.
5. WHEN uma alocação não possui data de fim definida, THE Componente_Gantt SHALL representar a alocação com uma data de fim equivalente a 31/12/2099 para indicar alocação por tempo indeterminado.
6. THE Componente_Gantt SHALL permitir filtrar as alocações por equipe e por período de visualização.
7. THE Componente_Gantt SHALL exibir visualmente as tarefas atribuídas a cada membro dentro do período de alocação, quando disponíveis.

### Requisito 7: Remoção da Tela de Relatórios

**User Story:** Como Tech Lead, eu quero que a tela de Relatórios seja removida da aplicação, pois todo o controle será feito via dashboards.

#### Critérios de Aceitação

1. THE Sistema_LeadHelper SHALL remover a rota "/panel/reports" e o componente ReportsPage da aplicação.
2. THE Sistema_LeadHelper SHALL remover a entrada "Relatórios" do menu de navegação lateral (DrawerNavigator).
3. THE Sistema_LeadHelper SHALL manter o serviço de exportação (report-exporter.ts) disponível internamente para possível uso futuro pelos dashboards.
4. IF um usuário acessar a URL "/panel/reports" diretamente, THEN THE Sistema_LeadHelper SHALL redirecionar para o dashboard padrão.

### Requisito 8: Cálculo de Horas Úteis para SLA

**User Story:** Como Tech Lead, eu quero que o cálculo de SLA considere apenas horas úteis (08h00–12h00 e 13h30–17h30), para que os prazos reflitam o tempo real de trabalho da equipe.

#### Critérios de Aceitação

1. THE Sistema_LeadHelper SHALL calcular horas úteis considerando exclusivamente os intervalos 08h00–12h00 e 13h30–17h30 de segunda a sexta-feira.
2. THE Sistema_LeadHelper SHALL considerar que 1 Dia_Útil equivale a 8 horas úteis.
3. WHEN o cálculo de horas úteis envolve um período que cruza fins de semana, THE Sistema_LeadHelper SHALL excluir sábados e domingos da contagem.
4. WHEN o cálculo de horas úteis envolve um período que cruza o intervalo de almoço (12h00–13h30), THE Sistema_LeadHelper SHALL excluir o intervalo de almoço da contagem.
5. WHEN o momento inicial do cálculo ocorre fora do Horário_Útil (antes das 08h00, durante o almoço, ou após 17h30), THE Sistema_LeadHelper SHALL iniciar a contagem a partir do próximo início de Horário_Útil.
6. FOR ALL pares de datas válidas, calcular horas úteis e depois converter de volta para data final SHALL produzir um resultado equivalente ao período original (propriedade round-trip).

### Requisito 9: Revisão e Garantia de Funcionalidade

**User Story:** Como Tech Lead, eu quero que todas as funcionalidades existentes sejam revisadas após a reestruturação, para garantir que nada foi quebrado durante o processo.

#### Critérios de Aceitação

1. WHEN a reestruturação é concluída, THE Sistema_LeadHelper SHALL manter funcional a sincronização completa com Azure DevOps (sprints, times, membros e tarefas).
2. WHEN a reestruturação é concluída, THE Sistema_LeadHelper SHALL manter funcional a gestão de equipes (criar, editar, desativar equipes).
3. WHEN a reestruturação é concluída, THE Sistema_LeadHelper SHALL manter funcional a gestão de membros (criar, editar, desativar membros e atribuir cargos).
4. WHEN a reestruturação é concluída, THE Sistema_LeadHelper SHALL manter funcional a gestão de alocações (criar, editar, remover alocações de membros em equipes).
5. WHEN a reestruturação é concluída, THE Sistema_LeadHelper SHALL manter funcional a gestão de sprints (criar, editar, visualizar sprints e seus itens).
6. WHEN a reestruturação é concluída, THE Sistema_LeadHelper SHALL manter funcional a autenticação de usuários e a configuração do Azure DevOps.
7. WHEN a reestruturação é concluída, THE Sistema_LeadHelper SHALL manter funcional o sistema de atualização automática (auto-updater).
