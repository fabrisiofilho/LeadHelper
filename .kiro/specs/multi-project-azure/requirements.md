# Requisitos — Suporte a Múltiplos Projetos Azure DevOps

## Contexto

O LeadHelper atualmente integra com um único projeto Azure DevOps (uma organização, um projeto, um PAT). Esta feature adiciona suporte a múltiplos projetos na mesma organização com um único PAT compartilhado.

**Decisões de negócio:**

- Um único PAT para todos os projetos (mesma organização Azure DevOps)
- Mesma `organizationUrl` para todos os projetos
- Cada projeto tem seus próprios Dashboard Sustentação e Dashboard Projetos
- Alocação de Tarefas é tela única com indicador de projeto por tarefa
- Gestão de Tarefas tem filtro por projeto
- Sincronização: todos os projetos em sequência, progresso visível por projeto

---

## Requirement 1: Schema do Banco de Dados — Múltiplos Projetos

**User Story:** Como desenvolvedor, quero que o banco de dados suporte múltiplas entradas de projeto Azure DevOps dentro da mesma organização.

### Acceptance Criteria

1. THE sistema SHALL manter a tabela `azure_devops_config` com uma linha por projeto Azure DevOps cadastrado, substituindo o modelo singleton anterior.

2. THE sistema SHALL garantir que a tabela `azure_devops_config` contenha os campos:
   - `id` INTEGER PK AUTOINCREMENT
   - `display_name` TEXT NOT NULL (máximo 100 chars, único)
   - `organization_url` TEXT NOT NULL
   - `project_name` TEXT NOT NULL
   - `pat_encrypted` TEXT NOT NULL
   - `sustentacao_area_path` TEXT nullable
   - `projetos_area_path` TEXT nullable
   - `is_active` INTEGER DEFAULT 1
   - `created_at` / `updated_at` DATETIME

3. THE sistema SHALL garantir que a combinação `organization_url` + `project_name` seja única na tabela, impedindo duplicatas.

4. THE sistema SHALL adicionar o campo `azure_devops_config_id` (INTEGER nullable, FK → `azure_devops_config.id` ON DELETE SET NULL) à tabela `tasks`. Tarefas manuais (`origin = 'manual'`) terão este campo como NULL.

5. THE sistema SHALL adicionar o campo `azure_devops_config_id` (INTEGER nullable, FK → `azure_devops_config.id` ON DELETE SET NULL) à tabela `sprints`.

6. WHEN o sistema executa a migração pela primeira vez, THE sistema SHALL executar migração retroativa: se existir uma linha em `azure_devops_config` e houver tarefas com `origin = 'azure_devops'` sem `azure_devops_config_id`, THE sistema SHALL associar essas tarefas ao `id` do projeto existente, em lotes de 500.

7. IF a migração retroativa falhar parcialmente, THEN THE sistema SHALL registrar o erro no log, reverter apenas o lote com falha e na próxima inicialização exibir aviso indicando migração incompleta.

8. THE sistema SHALL garantir que a exclusão de um registro em `azure_devops_config` defina `azure_devops_config_id = NULL` nas tarefas e sprints associados (ON DELETE SET NULL), sem excluir os registros.

---

## Requirement 2: Configuração — Gerenciador de Projetos Azure DevOps

**User Story:** Como usuário, quero gerenciar múltiplos projetos Azure DevOps em uma tela única com ações por projeto.

### Acceptance Criteria

1. WHEN o usuário acessa `/panel/azure-devops`, THE sistema SHALL exibir a página "Projetos Azure DevOps" com: lista de projetos cadastrados, botão "Adicionar Projeto" e botões "Editar", "Remover" e "Testar Conexão" por projeto.

2. WHEN a lista é exibida, THE sistema SHALL mostrar por projeto: `display_name`, `project_name`, `organization_url`, status de conexão e indicador `is_active`.

3. WHEN o usuário clica em "Adicionar Projeto", THE sistema SHALL exibir um formulário modal com os campos: "Nome de Exibição" (obrigatório), "URL da Organização" (obrigatório, deve iniciar com `https://`), "Nome do Projeto" (obrigatório), "Personal Access Token" (obrigatório no cadastro), "Area Path — Sustentação" (opcional), "Area Path — Projetos" (opcional).

4. WHEN o usuário submete o formulário válido, THE sistema SHALL salvar o projeto com PAT criptografado e exibir o projeto na lista.

5. IF a URL não começa com `https://` ou é inválida, THEN THE sistema SHALL exibir mensagem de erro sem salvar.

6. IF o `display_name` já existe em outro projeto, THEN THE sistema SHALL exibir mensagem de erro sem salvar.

7. IF a combinação `organization_url` + `project_name` já existe, THEN THE sistema SHALL exibir mensagem de erro indicando projeto duplicado.

8. WHEN o usuário clica em "Editar", THE sistema SHALL exibir o formulário com dados atuais, com campo PAT exibindo "••••••••". Se PAT for deixado em branco na edição, THE sistema SHALL manter o PAT existente.

9. WHEN o usuário clica em "Remover", THE sistema SHALL exibir diálogo de confirmação indicando que as tarefas serão desassociadas (não excluídas). Somente após confirmação THE sistema SHALL executar a remoção.

10. WHEN o usuário clica em "Testar Conexão", THE sistema SHALL realizar chamada à API Azure DevOps e exibir resultado (sucesso ou mensagem de erro específica) em até 15 segundos.

11. IF não houver projetos cadastrados, THE sistema SHALL exibir tela vazia com botão "Adicionar Projeto" destacado e mensagem orientando o usuário.

---

## Requirement 3: Sincronização — Fluxo Multi-projeto Sequencial

**User Story:** Como usuário, quero sincronizar todos os projetos em sequência com progresso visível por projeto.

### Acceptance Criteria

1. WHEN o usuário inicia a sincronização completa, THE sistema SHALL sincronizar projetos com `is_active = true` em sequência, na ordem de `id` crescente.

2. WHILE a sincronização está em execução, THE sistema SHALL exibir o modal de progresso com: `display_name` do projeto sendo sincronizado, chips de etapas (Sprints, Equipes, Work Items, Membros, Tarefas) com status por projeto, barra de progresso global, e contador "Projeto X de N".

3. WHEN um projeto começa a ser sincronizado, THE sistema SHALL emitir evento IPC `sync:progress` com campos adicionais: `projectName` (string com o `display_name`), `projectIndex` (inteiro, base 1), `projectTotal` (total de projetos ativos).

4. WHEN a sincronização de um projeto conclui com sucesso, THE sistema SHALL marcar aquele projeto como concluído (chip verde) e iniciar o próximo. O progresso global avança proporcionalmente: cada projeto = `100 / N` porcento.

5. IF a sincronização de um projeto falha completamente, THEN THE sistema SHALL registrar o erro, marcar o projeto com chip de aviso no modal e continuar com os demais projetos.

6. WHEN uma tarefa é criada ou atualizada durante a sincronização, THE sistema SHALL registrar `azure_devops_config_id` na tarefa com o `id` do projeto sendo sincronizado.

7. WHEN uma sprint é criada ou atualizada durante a sincronização, THE sistema SHALL registrar `azure_devops_config_id` na sprint com o `id` do projeto sendo sincronizado.

8. WHEN a sincronização completa termina, THE sistema SHALL emitir `sync:progress` com `step = 'complete'` e mensagem consolidada: total de projetos, tarefas criadas/atualizadas e erros.

9. IF não houver projetos com `is_active = true`, THEN THE sistema SHALL retornar erro imediato sem abrir o modal.

10. WHEN notificações de mudança de status são emitidas, THE sistema SHALL incluir o `display_name` do projeto na notificação nativa.

---

## Requirement 4: Dashboard Sustentação — Seletor de Projeto

**User Story:** Como usuário, quero selecionar qual projeto visualizar no Dashboard Sustentação.

### Acceptance Criteria

1. WHEN há dois ou mais projetos com `is_active = true`, THE sistema SHALL exibir dropdown de seleção de projeto no cabeçalho do Dashboard Sustentação.

2. WHEN há exatamente um projeto ativo, THE sistema SHALL exibir o dashboard sem dropdown, aplicando o projeto automaticamente.

3. WHEN o usuário seleciona um projeto, THE sistema SHALL filtrar itens com `azure_devops_config_id` correspondente E `area_path` iniciando com o `sustentacao_area_path` daquele projeto. Se `sustentacao_area_path` não estiver configurado, THE sistema SHALL usar `'Tribo SEIF\\Sustentação'` como fallback.

4. THE sistema SHALL persistir a seleção no `localStorage` com chave `dashboard-sustentacao-project-id`.

5. IF o projeto salvo no `localStorage` não existir mais, THEN THE sistema SHALL selecionar automaticamente o primeiro projeto ativo e limpar o `localStorage`.

6. WHEN o usuário altera o projeto, THE sistema SHALL recarregar os dados sem navegar para outra página.

7. WHEN a sincronização completa termina, THE sistema SHALL recarregar automaticamente os dados para o projeto selecionado.

---

## Requirement 5: Dashboard Projetos — Seletor de Projeto

**User Story:** Como usuário, quero selecionar qual projeto visualizar no Dashboard Projetos.

### Acceptance Criteria

1. WHEN há dois ou mais projetos com `is_active = true`, THE sistema SHALL exibir dropdown de seleção de projeto no cabeçalho do Dashboard Projetos.

2. WHEN há exatamente um projeto ativo, THE sistema SHALL exibir o dashboard sem dropdown.

3. WHEN o usuário seleciona um projeto, THE sistema SHALL filtrar itens com `azure_devops_config_id` correspondente E `area_path` iniciando com o `projetos_area_path` daquele projeto. Se `projetos_area_path` não estiver configurado, THE sistema SHALL usar `'Tribo SEIF\\Projetos'` como fallback.

4. THE sistema SHALL persistir a seleção no `localStorage` com chave `dashboard-projetos-project-id`.

5. IF o projeto salvo no `localStorage` não existir mais, THEN THE sistema SHALL selecionar automaticamente o primeiro projeto ativo.

6. WHEN o usuário altera o projeto, THE sistema SHALL recarregar os dados sem navegar para outra página.

7. WHEN a sincronização completa termina, THE sistema SHALL recarregar automaticamente para o projeto selecionado.

---

## Requirement 6: Alocação de Tarefas — Indicador de Projeto por Tarefa

**User Story:** Como usuário, quero identificar visualmente o projeto de origem de cada tarefa na tela de Alocação de Tarefas.

### Acceptance Criteria

1. WHEN há dois ou mais projetos com `is_active = true`, THE sistema SHALL exibir em cada tarefa com `origin = 'azure_devops'` e `azure_devops_config_id` não nulo, um Chip pequeno com o `display_name` do projeto, posicionado na linha do `externalId` e tipo da tarefa.

2. WHEN uma tarefa tem `origin = 'azure_devops'` e `azure_devops_config_id = NULL` (dados legados), THE sistema SHALL exibir Chip com texto "Projeto desconhecido" em cor neutra.

3. WHEN uma tarefa tem `origin = 'manual'`, THE sistema SHALL omitir o indicador de projeto.

4. WHEN há exatamente um projeto ativo, THE sistema SHALL omitir o indicador de projeto de todos os cards para não poluir a interface.

5. THE sistema SHALL manter a Alocação de Tarefas como tela única unificada, exibindo tarefas de todos os projetos simultaneamente.

---

## Requirement 7: Gestão de Tarefas — Filtro por Projeto

**User Story:** Como usuário, quero filtrar as tarefas na Gestão de Tarefas por projeto Azure DevOps.

### Acceptance Criteria

1. WHEN há dois ou mais projetos com `is_active = true`, THE sistema SHALL exibir filtro "Projeto Azure DevOps" (dropdown) na barra de filtros, com opção padrão "Todos os Projetos".

2. WHEN há exatamente um projeto ativo, THE sistema SHALL omitir o filtro de projeto.

3. WHEN o usuário seleciona um projeto no filtro, THE sistema SHALL filtrar a tabela por `azure_devops_config_id` correspondente, em conjunto com os demais filtros ativos.

4. WHEN há dois ou mais projetos ativos, THE sistema SHALL na coluna "Equipe" exibir o `display_name` do projeto associado via `azure_devops_config_id`, em lugar da inferência por `area_path`. Se `azure_devops_config_id` for nulo, THE sistema SHALL manter inferência por `area_path`.

5. IF o filtro por projeto ativo não retorna tarefas, THEN THE sistema SHALL exibir "0 resultado(s) encontrado(s)" sem mensagem de erro.

---

## Requirement 8: Rotas de Navegação — Sem Mudança de Rota

### Acceptance Criteria

1. THE sistema SHALL manter todas as rotas existentes sem alteração: `/panel/dashboard-sustentacao`, `/panel/dashboard-projetos`, `/panel/task-allocation`, `/panel/task-management`, `/panel/azure-devops`.

2. THE sistema SHALL manter o item "Azure DevOps" no drawer, apontando para `/panel/azure-devops`, que agora exibe o gerenciador de projetos.

3. THE sistema SHALL manter todos os redirects existentes sem modificação.

---

## Requirement 9: Compatibilidade Retroativa — Dados Existentes

**User Story:** Como usuário com dados já sincronizados, quero que meu histórico seja preservado após a atualização.

### Acceptance Criteria

1. WHEN o sistema executa a migração pela primeira vez, THE sistema SHALL preservar a linha existente em `azure_devops_config`, convertendo-a com `display_name` igual ao `project_name` existente e `is_active = 1`.

2. WHEN a migração retroativa é executada com uma linha existente, THE sistema SHALL atualizar todas as tarefas com `origin = 'azure_devops'` e `azure_devops_config_id IS NULL`, definindo `azure_devops_config_id` com o `id` daquela linha, em lotes de 500 registros.

3. WHEN a migração retroativa é executada, THE sistema SHALL também atualizar sprints com `azure_devops_config_id IS NULL`.

4. THE sistema SHALL remover as constantes hardcoded `SUSTENTACAO_AREA_PATH_PATTERN` e `PROJETOS_AREA_PATH_PATTERN` do `DashboardService` e substituir por leitura dos campos configurados por projeto, com fallback para os valores originais quando o campo estiver nulo.

5. WHEN o `DashboardService` busca itens para um projeto específico, THE sistema SHALL filtrar por `azure_devops_config_id = [id]` E `area_path LIKE '[area_path do projeto]%'`. Se `azure_devops_config_id` for nulo na tarefa (dado legado), THE sistema SHALL incluir a tarefa se o filtro de `area_path` for satisfeito.
