# Documento de Requisitos — Reestruturação do Hub Azure DevOps

## Introdução

Este documento descreve os requisitos para a reestruturação do sistema desktop (Electron + React + TypeORM/SQLite) para funcionar como um hub centralizado de planejamento de equipes integrado ao Azure DevOps. O cadastro de sprints, tarefas e equipes permanece no Azure DevOps; o hub foca em alocação de desenvolvedores por projeto, visualização de dados sincronizados e dashboards consolidados. Os dados do Azure DevOps são mapeados da seguinte forma: Iteration Path → Sprint, Area Path → Equipe, Assigned To → Membro.

## Análise da API Azure DevOps

> **RESTRIÇÃO FUNDAMENTAL**: A integração com o Azure DevOps é exclusivamente de LEITURA. O Hub nunca envia, cria, atualiza ou exclui dados no Azure DevOps. Todos os endpoints utilizados são de consulta (GET e POST para WIQL queries).

Esta seção documenta os endpoints da API REST do Azure DevOps utilizados pelo Hub para sincronização de dados. Todos os endpoints listados abaixo são exclusivamente de consulta (leitura).

### 1. Work Items via WIQL (parcialmente implementado)

- **Endpoint**: `POST {org}/{project}/_apis/wit/wiql?api-version=7.0`
- **Descrição**: Executa uma consulta WIQL que retorna IDs de work items. Os detalhes são obtidos via endpoint batch.
- **Campos disponíveis**: System.Id, System.Title, System.WorkItemType, System.State, System.Description, System.AssignedTo, System.CreatedDate, System.ChangedDate, System.AreaPath, System.IterationPath, System.Tags, Microsoft.VSTS.Scheduling.StoryPoints, Microsoft.VSTS.Common.Priority
- **Limite batch**: 200 IDs por requisição

### 2. Iterations (Sprints) — Classification Nodes

- **Endpoint**: `GET {org}/{project}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0`
- **Retorno**: id, name, path, children[], attributes (startDate, finishDate)
- **Status atual**: Implementado em `fetchIterations()`, porém NÃO armazena no Banco_Local. Necessita lógica de sync para persistir em SprintEntity.

### 3. Area Paths (Equipes) — Classification Nodes

- **Endpoint**: `GET {org}/{project}/_apis/wit/classificationnodes/Areas?$depth=10&api-version=7.0`
- **Retorno**: id, name, path, children[]
- **Status atual**: NÃO implementado. Necessita criação de `fetchAreaPaths()` para auto-criação/atualização de equipes.

### 4. Teams

- **Endpoint listar equipes**: `GET {org}/_apis/projects/{projectId}/teams?api-version=7.0`
- **Endpoint membros da equipe**: `GET {org}/_apis/projects/{projectId}/teams/{teamId}/members?api-version=7.0`
- **Status atual**: NÃO implementado.

### 5. Work Item Details (batch)

- **Endpoint**: `GET {org}/{project}/_apis/wit/workitems?ids={ids}&fields={fields}&api-version=7.0`
- **Status atual**: Implementado em `fetchWorkItemDetails()`.

---

## Mapeamento de Parsers

Esta seção detalha como cada campo do Azure DevOps é mapeado para as entidades locais do Banco_Local.

### Sprint Parser (Iteration Path → Sprint)

| Campo Azure DevOps                    | Campo Local (SprintEntity) | Observação                          |
| ------------------------------------- | -------------------------- | ----------------------------------- |
| `iterationPath.name`                  | `sprint.name`              | Nome da sprint                      |
| `iterationPath.attributes.startDate`  | `sprint.startDate`         | Data de início                      |
| `iterationPath.attributes.finishDate` | `sprint.endDate`           | Data de término                     |
| `iterationPath.path`                  | `sprint.iterationPath`     | **Campo novo — necessita migração** |

- **Atenção**: SprintEntity atualmente NÃO possui o campo `iterationPath`. É necessária uma migração de banco para adicioná-lo.
- **Atenção**: As datas de sprint vêm da API de Classification Nodes, não dos work items.

### Team Parser (Area Path → Equipe)

| Campo Azure DevOps | Campo Local (TeamEntity) | Observação                                  |
| ------------------ | ------------------------ | ------------------------------------------- |
| `areaPath.name`    | `team.name`              | Nome da equipe (ou match por azureAreaPath) |
| `areaPath.path`    | `team.azureAreaPath`     | Campo já existente                          |

- TeamEntity já possui o campo `azureAreaPath`. O método `resolveTeamByAreaPath()` já faz o matching.
- **Melhoria necessária**: Buscar area paths da API de Classification Nodes para auto-criar/atualizar equipes.

### Member Parser (Assigned To → Membro)

| Campo Azure DevOps       | Campo Local (TeamMemberEntity) | Observação                          |
| ------------------------ | ------------------------------ | ----------------------------------- |
| `assignedTo.displayName` | `teamMember.name`              | Nome do membro                      |
| `assignedTo.uniqueName`  | `teamMember.email`             | Email do membro                     |
| `assignedTo.id`          | `teamMember.azureUniqueId`     | **Campo novo — necessita migração** |

- **Atenção**: Atualmente apenas `displayName` é extraído. É necessário extrair também `uniqueName` (email) para matching confiável.
- **Atenção**: TeamMemberEntity necessita de um novo campo `azureUniqueId` para identificação confiável.

### Task Parser (Work Item → Tarefa)

| Campo Azure DevOps                      | Campo Local (TaskEntity) | Observação                           |
| --------------------------------------- | ------------------------ | ------------------------------------ |
| `System.Title`                          | `task.title`             | Título da tarefa                     |
| `System.Description`                    | `task.description`       | Descrição                            |
| `System.WorkItemType`                   | `task.type`              | Via `mapWorkItemType()`              |
| `System.State`                          | `task.status`            | Via `mapWorkItemStateToTaskStatus()` |
| `System.AreaPath`                       | `task.areaPath`          | Caminho da área                      |
| `System.IterationPath`                  | `task.iterationPath`     | Caminho da iteração                  |
| `System.Tags`                           | `task.tags`              | Tags                                 |
| `Microsoft.VSTS.Scheduling.StoryPoints` | `task.storyPoints`       | Story points                         |
| `Microsoft.VSTS.Common.Priority`        | `task.priority`          | Prioridade                           |
| `System.AssignedTo.displayName`         | `task.assignedToName`    | **Campo novo — necessita migração**  |
| `System.AssignedTo.uniqueName`          | `task.assignedToEmail`   | **Campo novo — necessita migração**  |

---

## Análise do Sistema Atual e Pontos de Melhoria

Esta seção documenta os problemas identificados no sistema atual e as melhorias necessárias.

### 1. Sincronização é baseada em importação, não em sync completo

O método `importWorkItems()` atual importa apenas work items selecionados. O novo requisito exige um sync completo que busque TODOS os work items do projeto e atualize o Banco_Local.

### 2. Sprints não são persistidas no Banco_Local

O método `fetchIterations()` busca iterações do Azure DevOps mas retorna os dados diretamente sem armazenar em SprintEntity. É necessário adicionar lógica de sync para persistir.

### 3. Area Paths não são sincronizados

Não existe endpoint para buscar area paths. É necessário implementar `fetchAreaPaths()` similar a `fetchIterations()` para auto-criação/atualização de equipes.

### 4. Extração de membros é incompleta

O campo `System.AssignedTo` retorna um objeto com `displayName` e `uniqueName` (email), mas o código atual extrai apenas `displayName`. É necessário extrair ambos para matching/criação confiável de membros.

### 5. TaskEntity não possui campo assignedTo

A entidade de tarefa não persiste o nome do membro atribuído. Os campos `assignedToName` e `assignedToEmail` precisam ser adicionados à TaskEntity.

### 6. SprintEntity não possui campo iterationPath

Não é possível vincular tarefas a sprints pelo iteration path. É necessária uma migração para adicionar o campo.

### 7. TeamMemberAllocationEntity possui dedicationPercentage

O campo `dedicationPercentage` deve ser REMOVIDO do schema. A alocação deve ser dinâmica, sem percentual de dedicação. A coluna será eliminada na migração consolidada.

### 8. TeamMemberAllocationEntity sem campo "Motivo"

O usuário deseja um campo de anotação "Motivo" na alocação. A entidade possui `notes` que pode servir a esse propósito, mas deve ser renomeado/clarificado para "motivo".

### 9. Sem detecção de conflito de alocação

O usuário deseja alertas quando um membro está alocado na Equipe X mas possui tarefas na Equipe Y. Essa lógica de referência cruzada não existe atualmente.

### 10. Sem restrição de unicidade em alocações ativas

O usuário deseja impedir que o mesmo membro esteja em duas equipes simultaneamente. A validação atual verifica sobreposição apenas na MESMA equipe, não entre equipes diferentes.

### 11. Dashboard é básico

O DashboardService atual fornece apenas activeMembers, tasksInProgress, totalAllocations. Necessita expansão para os três contextos de dashboard (Alocação, Gestão de Tarefas, Sprints).

### 12. Gantt é uma página separada

A visualização Gantt precisa ser movida para dentro do Dashboard como componente integrado.

### 13. Relatórios buscam dados diretamente do Azure

O método `getReportData()` busca da API do Azure a cada chamada. Deve utilizar dados do Banco_Local após sincronização.

### 14. Página de Sistema possui cards em excesso

Atualmente exibe 8 cards (Cargos, Equipes, Membros, Alocação em Equipes, Sprints, Tarefas, Alocações, Azure DevOps). Deve exibir apenas: Cargos, Equipes, Membros, Azure DevOps.

### 15. Navegação possui itens extras

Gantt e Relatórios Azure DevOps são itens de menu separados. Devem ser removidos e integrados ao Dashboard.

### Estrutura de Navegação Atual (a ser alterada)

| Item Atual              | Ação                                          |
| ----------------------- | --------------------------------------------- |
| Dashboard               | MANTER (expandir com dashboards por contexto) |
| Alocação de Equipes     | MANTER                                        |
| Gestão de Tarefas       | MANTER                                        |
| Sprints e Tarefas       | MANTER                                        |
| Gantt                   | REMOVER (integrar ao Dashboard)               |
| Relatórios Azure DevOps | REMOVER (integrar ao Dashboard)               |
| Sistema                 | MANTER (reduzir cards)                        |

### Cards do Sistema Atual (a ser reduzido)

| Card Atual          | Ação                          |
| ------------------- | ----------------------------- |
| Cargos              | MANTER                        |
| Equipes             | MANTER                        |
| Membros             | MANTER                        |
| Alocação em Equipes | REMOVER (tem tela dedicada)   |
| Sprints             | REMOVER (vem do Azure DevOps) |
| Tarefas             | REMOVER (vem do Azure DevOps) |
| Alocações           | REMOVER (vem do Azure DevOps) |
| Azure DevOps        | MANTER                        |

---

## Glossário

- **Hub**: A aplicação desktop Electron que centraliza informações de planejamento de equipes.
- **Azure_DevOps**: Serviço externo de onde são importados sprints, tarefas e membros.
- **Parser_Azure**: Módulo responsável por mapear campos do Azure DevOps para entidades locais (Iteration Path → Sprint, Area Path → Equipe, Assigned To → Membro).
- **Banco_Local**: Banco de dados SQLite local onde os dados sincronizados do Azure DevOps são armazenados.
- **Alocação_Equipe**: Processo de vincular um desenvolvedor a um projeto/equipe com anotação de motivo.
- **Dashboard_Hub**: Tela centralizada de informações com dashboards por contexto (Alocação, Gestão de Tarefas, Sprints).
- **Gestão_Tarefas**: Tela de gerenciamento de tarefas com layout Kanban existente.
- **Sprints_Tarefas**: Tela de visualização somente-leitura de tarefas agrupadas por sprint.
- **Gantt**: Visualização de cronograma tipo Gantt, agora integrada ao Dashboard.
- **Sistema_Cadastros**: Módulo de configurações do sistema com cadastros permitidos.
- **Membro**: Pessoa cadastrada no sistema, correspondente ao campo Assigned To do Azure DevOps.
- **Equipe**: Grupo de membros, correspondente ao Area Path do Azure DevOps.
- **Sprint**: Iteração de trabalho, correspondente ao Iteration Path do Azure DevOps.

## Requisitos

### Requisito 1: Sincronização Completa de Dados do Azure DevOps

**User Story:** Como gestor de equipe, eu quero que o hub realize uma sincronização completa de sprints, tarefas e membros diretamente do Azure DevOps, para que eu tenha todos os dados atualizados sem cadastro manual.

#### Critérios de Aceitação

1. WHEN o usuário solicita uma sincronização, THE Parser_Azure SHALL buscar TODOS os work items do projeto via endpoint WIQL (`POST {org}/{project}/_apis/wit/wiql`) e persistir no Banco_Local, respeitando o limite de 200 IDs por requisição batch.
2. WHEN o usuário solicita uma sincronização, THE Parser_Azure SHALL buscar as iterações via endpoint Classification Nodes (`GET {org}/{project}/_apis/wit/classificationnodes/Iterations?$depth=10`) e persistir cada iteração como SprintEntity no Banco_Local, incluindo name, startDate, finishDate e iterationPath.
3. WHEN o usuário solicita uma sincronização, THE Parser_Azure SHALL buscar os area paths via endpoint Classification Nodes (`GET {org}/{project}/_apis/wit/classificationnodes/Areas?$depth=10`) e auto-criar ou atualizar TeamEntity no Banco_Local com base no campo azureAreaPath.
4. WHEN o usuário solicita uma sincronização, THE Parser_Azure SHALL extrair do campo System.AssignedTo tanto o displayName quanto o uniqueName (email) para criar ou atualizar TeamMemberEntity no Banco_Local.
5. WHEN a sincronização é concluída, THE Hub SHALL armazenar todos os dados obtidos no Banco_Local para uso offline e nos dashboards.
6. IF a configuração do Azure DevOps não estiver definida, THEN THE Hub SHALL exibir um aviso informando que a integração precisa ser configurada antes de buscar dados.
7. IF ocorrer um erro de conexão durante a sincronização, THEN THE Hub SHALL exibir uma mensagem de erro descritiva e manter os dados previamente sincronizados no Banco_Local.
8. THE Hub SHALL utilizar dados do Banco_Local para relatórios e dashboards, sem buscar dados diretamente da API do Azure DevOps a cada chamada.

### Requisito 2: Alocação Dinâmica de Equipe

**User Story:** Como gestor de equipe, eu quero alocar desenvolvedores em projetos de forma dinâmica dentro do hub, para que eu tenha controle centralizado da distribuição da equipe.

#### Critérios de Aceitação

1. THE Alocação_Equipe SHALL permitir vincular um Membro a uma Equipe diretamente na interface do Hub.
2. THE Alocação_Equipe SHALL utilizar alocação dinâmica, sem campo de percentual de dedicação.
3. WHEN um Membro é alocado a uma Equipe, THE Alocação_Equipe SHALL exigir o preenchimento de uma anotação de "Motivo" para a alocação.
4. THE Alocação_Equipe SHALL permitir cadastrar novas alocações de Membro em Equipe.
5. THE Alocação_Equipe SHALL permitir editar alocações existentes de Membro em Equipe.
6. THE Alocação_Equipe SHALL permitir excluir uma alocação de Membro em Equipe.
7. THE Alocação_Equipe SHALL permitir finalizar o processo de alocação de um Membro em uma Equipe, marcando a alocação como encerrada.

### Requisito 3: Dashboard Hub Centralizado

**User Story:** Como gestor de equipe, eu quero uma tela de dashboard centralizada com informações de cada contexto do sistema, para que eu tenha uma visão consolidada do planejamento.

#### Critérios de Aceitação

1. THE Dashboard_Hub SHALL apresentar um dashboard específico para o contexto de Alocação de Equipe.
2. THE Dashboard_Hub SHALL apresentar um dashboard específico para o contexto de Gestão de Tarefas.
3. THE Dashboard_Hub SHALL apresentar um dashboard específico para o contexto de Sprints e Tarefas.
4. THE Dashboard_Hub SHALL integrar a visualização Gantt como um componente dentro do dashboard, removendo a tela separada de Gantt.
5. THE Dashboard_Hub SHALL integrar os dados de Relatórios Azure DevOps, utilizando exclusivamente dados armazenados no Banco_Local após sincronização, sem buscar dados diretamente da API do Azure DevOps.
6. IF a configuração do Azure DevOps não estiver definida, THEN THE Dashboard_Hub SHALL exibir um aviso informando que a integração precisa ser configurada para exibir dados completos.
7. WHEN os dados do Banco_Local são atualizados via sincronização, THE Dashboard_Hub SHALL refletir os dados atualizados nos dashboards.

### Requisito 4: Gestão de Tarefas (Somente Leitura de Dados Sincronizados)

**User Story:** Como gestor de equipe, eu quero manter o layout atual da tela de Gestão de Tarefas, ajustando apenas a origem dos dados, para que o cadastro de tarefas venha do Azure DevOps e seja exibido como somente leitura.

#### Critérios de Aceitação

1. THE Gestão_Tarefas SHALL manter o layout atual de visualização de tarefas.
2. THE Gestão_Tarefas SHALL remover a funcionalidade de cadastro manual de tarefas, mantendo apenas tarefas originadas do Azure DevOps.
3. THE Gestão_Tarefas SHALL remover a funcionalidade de alocação manual de membros em tarefas, utilizando o campo Assigned To sincronizado do Azure DevOps.
4. THE Gestão_Tarefas SHALL exibir tarefas sincronizadas do Banco_Local com os dados mapeados pelo Parser_Azure.
5. THE Gestão_Tarefas SHALL exibir tarefas sincronizadas como somente leitura, sem permitir edição de título, descrição, status, tipo, assignee ou qualquer campo originado do Azure DevOps.

### Requisito 5: Sprints e Tarefas (Somente Leitura)

**User Story:** Como gestor de equipe, eu quero visualizar as tarefas agrupadas por sprint com base nos dados do Azure DevOps, sem possibilidade de edição, para ter uma visão clara do andamento.

#### Critérios de Aceitação

1. THE Sprints_Tarefas SHALL exibir tarefas agrupadas por Sprint com base nos dados sincronizados do Azure DevOps armazenados no Banco_Local.
2. THE Sprints_Tarefas SHALL remover todos os recursos de cadastro e edição de sprints e tarefas.
3. THE Sprints_Tarefas SHALL utilizar o mesmo componente de tabela da tela de Gestão de Tarefas para exibir as tarefas.
4. THE Sprints_Tarefas SHALL permitir filtrar tarefas por Sprint.

### Requisito 6: Reestruturação do Módulo Sistema

**User Story:** Como gestor de equipe, eu quero que o módulo de Sistema contenha apenas os cadastros que ainda são gerenciados localmente, para evitar duplicidade com o Azure DevOps.

#### Critérios de Aceitação

1. THE Sistema_Cadastros SHALL manter o cadastro de Cargos.
2. THE Sistema_Cadastros SHALL manter o cadastro de Equipes.
3. THE Sistema_Cadastros SHALL manter o cadastro de Membros.
4. THE Sistema_Cadastros SHALL manter a configuração do Azure DevOps.
5. THE Sistema_Cadastros SHALL remover o cadastro de Sprints do módulo de sistema, pois Sprints são gerenciadas exclusivamente no Azure DevOps.
6. THE Sistema_Cadastros SHALL remover o cadastro de Tarefas do módulo de sistema, pois Tarefas são gerenciadas exclusivamente no Azure DevOps.
7. THE Sistema_Cadastros SHALL remover o cadastro de Alocações (membro-tarefa) do módulo de sistema, pois a atribuição é feita via Azure DevOps.
8. THE Sistema_Cadastros SHALL remover o cadastro de Alocação em Equipes do módulo de sistema, pois essa funcionalidade é gerenciada na tela dedicada de Alocação de Equipe.

### Requisito 7: Reestruturação da Navegação

**User Story:** Como usuário do sistema, eu quero que a navegação reflita a nova estrutura do hub, para que eu encontre as funcionalidades de forma intuitiva.

#### Critérios de Aceitação

1. THE Hub SHALL exibir no menu lateral os itens: Dashboard, Alocação de Equipes, Gestão de Tarefas, Sprints e Tarefas, e Sistema.
2. THE Hub SHALL remover o item Gantt do menu lateral, pois a visualização Gantt é integrada ao Dashboard.
3. THE Hub SHALL remover o item Relatórios Azure DevOps do menu lateral, pois os relatórios são integrados ao Dashboard.
4. WHEN o usuário acessa o Sistema, THE Hub SHALL exibir apenas os cards de navegação para: Cargos, Equipes, Membros e Azure DevOps.

### Requisito 8: Migração de Entidades para Suporte à Sincronização

**User Story:** Como desenvolvedor, eu quero que as entidades locais possuam todos os campos necessários para mapear corretamente os dados do Azure DevOps, para que a sincronização seja confiável e completa.

#### Critérios de Aceitação

1. THE SprintEntity SHALL possuir o campo `iterationPath` (string) para armazenar o caminho completo da iteração do Azure DevOps (ex: "Project\Sprint 1").
2. THE TeamMemberEntity SHALL possuir o campo `azureUniqueId` (string, nullable) para armazenar o identificador único do membro no Azure DevOps.
3. THE TaskEntity SHALL possuir o campo `assignedToName` (string, nullable) para armazenar o displayName do membro atribuído no Azure DevOps.
4. THE TaskEntity SHALL possuir o campo `assignedToEmail` (string, nullable) para armazenar o uniqueName (email) do membro atribuído no Azure DevOps.
5. THE TeamMemberAllocationEntity SHALL remover o campo `dedicationPercentage` do schema, eliminando a coluna da tabela `team_member_allocations` na migração consolidada.
6. THE TeamMemberAllocationEntity SHALL utilizar o campo `notes` como campo de "Motivo" para anotação da razão da alocação.

### Requisito 9: Validação de Alocação entre Equipes

**User Story:** Como gestor de equipe, eu quero que o sistema detecte conflitos de alocação entre equipes, para que eu saiba quando um membro está alocado em uma equipe mas possui tarefas em outra.

#### Critérios de Aceitação

1. WHEN um Membro está alocado na Equipe X e possui tarefas com Area Path correspondente à Equipe Y, THE Hub SHALL exibir um alerta de conflito de alocação no Dashboard de Alocação.
2. THE Alocação_Equipe SHALL validar unicidade de alocação ativa entre TODAS as equipes, impedindo que o mesmo Membro esteja alocado em duas Equipes diferentes simultaneamente.
3. IF o gestor tentar criar uma alocação para um Membro que já possui alocação ativa em outra Equipe, THEN THE Alocação_Equipe SHALL impedir a operação e exibir uma mensagem informando em qual Equipe o Membro já está alocado.

### Requisito 10: Integridade do Parser (Round-Trip para Testes)

**User Story:** Como desenvolvedor, eu quero garantir que os parsers de dados do Azure DevOps mapeiem corretamente os campos para entidades locais, para que não haja perda de dados na sincronização.

> **Nota**: As propriedades round-trip descritas abaixo são exclusivamente para fins de testes automatizados (property-based testing). O "formatar de volta" refere-se a um pretty-printer de teste que reconstrói o formato da API a partir da entidade local, permitindo verificar a integridade do parser. O Hub NUNCA envia dados formatados de volta para o Azure DevOps.

#### Critérios de Aceitação

1. FOR ALL SprintEntity válidas, THE Parser_Azure SHALL garantir que parsear os dados da API de Classification Nodes, formatar de volta para o formato da API (via pretty-printer de teste) e parsear novamente produza um objeto equivalente (propriedade round-trip para validação de testes).
2. FOR ALL TeamEntity válidas, THE Parser_Azure SHALL garantir que parsear os dados de Area Path, formatar de volta (via pretty-printer de teste) e parsear novamente produza um objeto equivalente (propriedade round-trip para validação de testes).
3. FOR ALL TeamMemberEntity válidas, THE Parser_Azure SHALL garantir que parsear os dados de Assigned To, formatar de volta (via pretty-printer de teste) e parsear novamente produza um objeto equivalente (propriedade round-trip para validação de testes).
4. FOR ALL TaskEntity válidas, THE Parser_Azure SHALL garantir que parsear os dados de Work Item, formatar de volta (via pretty-printer de teste) e parsear novamente produza um objeto equivalente (propriedade round-trip para validação de testes).

### Requisito 11: Restrição de Somente Leitura para Dados do Azure DevOps

**User Story:** Como gestor de equipe, eu quero que os dados sincronizados do Azure DevOps sejam somente leitura no Hub, para garantir que a fonte de verdade permaneça no Azure DevOps.

#### Critérios de Aceitação

1. THE Hub SHALL NEVER enviar, criar, atualizar ou excluir dados no Azure DevOps. A integração é exclusivamente de leitura (somente GET requests e WIQL queries de consulta).
2. THE Hub SHALL impedir a edição de dados sincronizados do Azure DevOps no Banco_Local, incluindo: Sprints (SprintEntity sincronizadas), Tarefas (TaskEntity com origin='azure_devops'), e dados de Membros importados via System.AssignedTo.
3. THE Gestão_Tarefas SHALL exibir tarefas sincronizadas como somente leitura, sem permitir edição de título, descrição, status, tipo, assignee ou qualquer campo originado do Azure DevOps.
4. THE Sprints_Tarefas SHALL exibir sprints e tarefas como somente leitura, sem nenhum recurso de edição.
5. THE Hub SHALL permitir cadastro, edição e exclusão apenas de dados gerenciados localmente: Alocações de Equipe, Cargos, configuração de Equipes, configuração de Membros e configuração do Azure DevOps.
6. IF um usuário tentar editar um dado sincronizado do Azure DevOps, THEN THE Hub SHALL exibir uma mensagem informando que o dado é gerenciado no Azure DevOps e não pode ser editado localmente.

### Requisito 12: Consolidação do Schema de Banco de Dados

**User Story:** Como desenvolvedor, eu quero que todas as migrações de banco de dados sejam consolidadas em um único arquivo de schema inicial, para que o banco seja criado de forma limpa e sem tabelas/colunas obsoletas.

#### Critérios de Aceitação

1. THE Banco_Local SHALL consolidar todas as migrações existentes (001 a 008) e a migração planejada (009) em um único arquivo `001_leadhelper_schema.sql` que cria o schema completo do zero.
2. THE Banco_Local SHALL remover as tabelas `allocations`, `task_status_config` e `team_member_teams` do schema consolidado, pois são tabelas obsoletas substituídas pela integração com Azure DevOps.
3. THE Banco_Local SHALL remover as colunas `estimation_points`, `estimation_hours`, `estimation_type`, `external_source` e `assignee_id` da tabela `tasks` no schema consolidado, pois são campos não utilizados com dados do Azure DevOps.
4. THE Banco_Local SHALL remover a coluna `dedication_percentage` da tabela `team_member_allocations` no schema consolidado, pois a alocação é dinâmica sem percentual de dedicação.
5. THE Banco_Local SHALL incluir no schema consolidado todos os campos novos: `iteration_path` em `sprints`, `azure_unique_id` em `team_members`, `assigned_to_name` e `assigned_to_email` em `tasks`.
6. THE Banco_Local SHALL incluir os dados padrão de cargos (positions) no schema consolidado.
7. WHEN o schema consolidado é aplicado, THE Banco_Local SHALL remover os arquivos de migração antigos (002 a 008), mantendo apenas `001_leadhelper_schema.sql`.
