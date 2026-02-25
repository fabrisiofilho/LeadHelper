/**
 * Configuração centralizada de mensagens de toast para ações IPC
 * Define mensagens de sucesso e erro para cada canal IPC
 */

export interface ToastConfig {
  success?: string;
  error?: string;
  silent?: boolean; // Se true, não exibe toast (para operações de leitura)
}

type IpcToastMessages = Record<string, ToastConfig>;

export const IPC_TOAST_MESSAGES: IpcToastMessages = {
  // ==================== ACCOUNT ====================
  'account:create': {
    success: 'Conta criada com sucesso!',
    error: 'Erro ao criar conta',
  },
  'account:update': {
    success: 'Conta atualizada com sucesso!',
    error: 'Erro ao atualizar conta',
  },
  'account:delete': {
    success: 'Conta excluída com sucesso!',
    error: 'Erro ao excluir conta',
  },
  'account:findById': { silent: true },
  'account:findAll': { silent: true },
  'account:getBalance': { silent: true },
  'account:getTotalBalance': { silent: true },

  // ==================== CATEGORY ====================
  'category:create': {
    success: 'Categoria criada com sucesso!',
    error: 'Erro ao criar categoria',
  },
  'category:update': {
    success: 'Categoria atualizada com sucesso!',
    error: 'Erro ao atualizar categoria',
  },
  'category:delete': {
    success: 'Categoria excluída com sucesso!',
    error: 'Erro ao excluir categoria',
  },
  'category:findById': { silent: true },
  'category:findAll': { silent: true },
  'category:findByType': { silent: true },
  'category:initializeDefaults': { silent: true },

  // ==================== TRANSACTION ====================
  'transaction:create': {
    success: 'Transação criada com sucesso!',
    error: 'Erro ao criar transação',
  },
  'transaction:update': {
    success: 'Transação atualizada com sucesso!',
    error: 'Erro ao atualizar transação',
  },
  'transaction:delete': {
    success: 'Transação excluída com sucesso!',
    error: 'Erro ao excluir transação',
  },
  'transaction:deleteMany': {
    success: 'Transações excluídas com sucesso!',
    error: 'Erro ao excluir transações',
  },
  'transaction:findById': { silent: true },
  'transaction:findAll': { silent: true },
  'transaction:findByPeriod': { silent: true },
  'transaction:findByCategory': { silent: true },
  'transaction:getMonthSummary': { silent: true },

  // ==================== GOAL ====================
  'goal:create': {
    success: 'Meta criada com sucesso!',
    error: 'Erro ao criar meta',
  },
  'goal:update': {
    success: 'Meta atualizada com sucesso!',
    error: 'Erro ao atualizar meta',
  },
  'goal:delete': {
    success: 'Meta excluída com sucesso!',
    error: 'Erro ao excluir meta',
  },
  'goal:addContribution': {
    success: 'Contribuição adicionada com sucesso!',
    error: 'Erro ao adicionar contribuição',
  },
  'goal:findById': { silent: true },
  'goal:findAll': { silent: true },
  'goal:getProgress': { silent: true },

  // ==================== ALERT ====================
  'alert:create': {
    success: 'Alerta criado com sucesso!',
    error: 'Erro ao criar alerta',
  },
  'alert:update': {
    success: 'Alerta atualizado com sucesso!',
    error: 'Erro ao atualizar alerta',
  },
  'alert:delete': {
    success: 'Alerta excluído com sucesso!',
    error: 'Erro ao excluir alerta',
  },
  'alert:findAll': { silent: true },
  'alert:checkAlerts': { silent: true },

  // ==================== CREDIT CARD ====================
  'creditCard:payInvoice': {
    success: 'Fatura paga com sucesso!',
    error: 'Erro ao pagar fatura',
  },
  'creditCard:closeCurrentInvoice': {
    success: 'Fatura fechada com sucesso!',
    error: 'Erro ao fechar fatura',
  },
  'creditCard:getInvoices': { silent: true },
  'creditCard:getInvoiceDetails': { silent: true },
  'creditCard:getCreditCardsSummary': { silent: true },
  'creditCard:getCreditCardSummary': { silent: true },

  // ==================== REPORT ====================
  'report:generatePDF': {
    success: 'Relatório PDF gerado com sucesso!',
    error: 'Erro ao gerar relatório PDF',
  },
  'report:generateCSV': {
    success: 'Relatório CSV gerado com sucesso!',
    error: 'Erro ao gerar relatório CSV',
  },
  'report:getExpensesByCategory': { silent: true },
  'report:getIncomeVsExpenses': { silent: true },

  // ==================== IMPORT ====================
  'import:previewCSV': { silent: true },
  'import:importCSV': {
    success: 'Dados importados com sucesso!',
    error: 'Erro ao importar dados',
  },

  // ==================== AUTH ====================
  'auth:register': {
    success: 'Conta criada com sucesso!',
    error: 'Erro ao criar conta',
  },
  'auth:login': {
    success: 'Login realizado com sucesso!',
    error: 'Erro ao fazer login',
  },
  'auth:logout': {
    success: 'Logout realizado com sucesso!',
    error: 'Erro ao fazer logout',
  },
  'auth:updateProfile': {
    success: 'Perfil atualizado com sucesso!',
    error: 'Erro ao atualizar perfil',
  },
  'auth:changePassword': {
    success: 'Senha alterada com sucesso!',
    error: 'Erro ao alterar senha',
  },
  'auth:checkAuth': { silent: true },
  'auth:getCurrentUser': { silent: true },

  // ==================== AUTO UPDATER ====================
  'autoUpdater:getAppVersion': { silent: true },
  'autoUpdater:checkForUpdates': { silent: true },
  'autoUpdater:downloadUpdate': { silent: true },
  'autoUpdater:installUpdate': { silent: true },
  'autoUpdater:getUpdateState': { silent: true },

  // ==================== POSITION ====================
  'position:create': {
    success: 'Cargo criado com sucesso!',
    error: 'Erro ao criar cargo',
  },
  'position:update': {
    success: 'Cargo atualizado com sucesso!',
    error: 'Erro ao atualizar cargo',
  },
  'position:delete': {
    success: 'Cargo excluído com sucesso!',
    error: 'Erro ao excluir cargo',
  },
  'position:findById': { silent: true },
  'position:findAll': { silent: true },
  'position:activate': {
    success: 'Cargo ativado com sucesso!',
    error: 'Erro ao ativar cargo',
  },
  'position:deactivate': {
    success: 'Cargo desativado com sucesso!',
    error: 'Erro ao desativar cargo',
  },

  // ==================== TEAM ====================
  'team:create': {
    success: 'Equipe criada com sucesso!',
    error: 'Erro ao criar equipe',
  },
  'team:update': {
    success: 'Equipe atualizada com sucesso!',
    error: 'Erro ao atualizar equipe',
  },
  'team:delete': {
    success: 'Equipe excluída com sucesso!',
    error: 'Erro ao excluir equipe',
  },
  'team:findById': { silent: true },
  'team:findAll': { silent: true },
  'team:activate': {
    success: 'Equipe ativada com sucesso!',
    error: 'Erro ao ativar equipe',
  },
  'team:deactivate': {
    success: 'Equipe desativada com sucesso!',
    error: 'Erro ao desativar equipe',
  },
  'team:addMember': {
    success: 'Membro adicionado à equipe com sucesso!',
    error: 'Erro ao adicionar membro à equipe',
  },
  'team:removeMember': {
    success: 'Membro removido da equipe com sucesso!',
    error: 'Erro ao remover membro da equipe',
  },

  // ==================== SPRINT ====================
  'sprint:create': {
    success: 'Sprint criada com sucesso!',
    error: 'Erro ao criar sprint',
  },
  'sprint:update': {
    success: 'Sprint atualizada com sucesso!',
    error: 'Erro ao atualizar sprint',
  },
  'sprint:delete': {
    success: 'Sprint excluída com sucesso!',
    error: 'Erro ao excluir sprint',
  },
  'sprint:findById': { silent: true },
  'sprint:findAll': { silent: true },
  'sprint:findByTeam': { silent: true },
  'sprint:findCurrent': { silent: true },
  'sprint:findUpcoming': { silent: true },
  'sprint:activate': {
    success: 'Sprint ativada com sucesso!',
    error: 'Erro ao ativar sprint',
  },
  'sprint:deactivate': {
    success: 'Sprint desativada com sucesso!',
    error: 'Erro ao desativar sprint',
  },

  // ==================== TEAM MEMBER ====================
  'team-member:create': {
    success: 'Membro criado com sucesso!',
    error: 'Erro ao criar membro',
  },
  'team-member:update': {
    success: 'Membro atualizado com sucesso!',
    error: 'Erro ao atualizar membro',
  },
  'team-member:deactivate': {
    success: 'Membro desativado com sucesso!',
    error: 'Erro ao desativar membro',
  },
  'team-member:activate': {
    success: 'Membro ativado com sucesso!',
    error: 'Erro ao ativar membro',
  },
  'team-member:findById': { silent: true },
  'team-member:findAll': { silent: true },
  'team-member:findByRole': { silent: true },

  // ==================== TASK ====================
  'task:create': {
    success: 'Tarefa criada com sucesso!',
    error: 'Erro ao criar tarefa',
  },
  'task:update': {
    success: 'Tarefa atualizada com sucesso!',
    error: 'Erro ao atualizar tarefa',
  },
  'task:delete': {
    success: 'Tarefa excluída com sucesso!',
    error: 'Erro ao excluir tarefa',
  },
  'task:findById': { silent: true },
  'task:findAll': { silent: true },
  'task:findByStatus': { silent: true },
  'task:findByPeriod': { silent: true },
  'task:findBySprint': { silent: true },

  // ==================== ALLOCATION ====================
  'allocation:create': {
    success: 'Alocação criada com sucesso!',
    error: 'Erro ao criar alocação',
  },
  'allocation:update': {
    success: 'Alocação atualizada com sucesso!',
    error: 'Erro ao atualizar alocação',
  },
  'allocation:delete': {
    success: 'Alocação excluída com sucesso!',
    error: 'Erro ao excluir alocação',
  },
  'allocation:findById': { silent: true },
  'allocation:findByTeamMember': { silent: true },
  'allocation:findByTask': { silent: true },
  'allocation:findByPeriod': { silent: true },
  'allocation:getGanttData': { silent: true },

  // ==================== TEAM MEMBER ALLOCATION ====================
  'team-member-allocation:create': {
    success: 'Alocação de membro criada com sucesso!',
    error: 'Erro ao criar alocação de membro',
  },
  'team-member-allocation:update': {
    success: 'Alocação de membro atualizada com sucesso!',
    error: 'Erro ao atualizar alocação de membro',
  },
  'team-member-allocation:delete': {
    success: 'Alocação de membro excluída com sucesso!',
    error: 'Erro ao excluir alocação de membro',
  },
  'team-member-allocation:deactivate': {
    success: 'Alocação encerrada com sucesso!',
    error: 'Erro ao encerrar alocação',
  },
  'team-member-allocation:findById': { silent: true },
  'team-member-allocation:findByTeam': { silent: true },
  'team-member-allocation:findByTeamMember': { silent: true },
  'team-member-allocation:findActiveByTeam': { silent: true },
  'team-member-allocation:findActiveByTeamMember': { silent: true },
  'team-member-allocation:findAll': { silent: true },
  'team-member-allocation:getTeamCapacity': { silent: true },
  'team-member-allocation:getMemberAvailability': { silent: true },

  // ==================== DASHBOARD ====================
  'dashboard:getSummary': { silent: true },
  'dashboard:getActiveMembers': { silent: true },
  'dashboard:getTasksInProgress': { silent: true },
  'dashboard:getMembersWithHighWorkload': { silent: true },
  'dashboard:getMembersWithoutAllocation': { silent: true },

  // ==================== AZURE DEVOPS ====================
  'azure-devops:saveConfig': {
    success: 'Configuração do Azure DevOps salva com sucesso!',
    error: 'Erro ao salvar configuração do Azure DevOps',
  },
  'azure-devops:getConfig': { silent: true },
  'azure-devops:testConnection': { silent: true },
  'azure-devops:fetchWorkItems': { silent: true },
  'azure-devops:importWorkItems': {
    success: 'Work items importados com sucesso!',
    error: 'Erro ao importar work items',
  },
  'azure-devops:syncTask': {
    success: 'Tarefa sincronizada com sucesso!',
    error: 'Erro ao sincronizar tarefa',
  },
  'azure-devops:syncAllImportedTasks': {
    success: 'Tarefas sincronizadas com sucesso!',
    error: 'Erro ao sincronizar tarefas',
  },

  // ==================== TASK STATUS CONFIG ====================
  'task-status-config:findAll': { silent: true },
  'task-status-config:findKanban': { silent: true },
  'task-status-config:create': {
    success: 'Status criado com sucesso!',
    error: 'Erro ao criar status',
  },
  'task-status-config:update': {
    success: 'Status atualizado com sucesso!',
    error: 'Erro ao atualizar status',
  },
  'task-status-config:delete': {
    success: 'Status excluído com sucesso!',
    error: 'Erro ao excluir status',
  },

  // ==================== TASK COMMENT ====================
  'task-comment:findByTask': { silent: true },
  'task-comment:create': {
    success: 'Comentário adicionado com sucesso!',
    error: 'Erro ao adicionar comentário',
  },
  'task-comment:update': {
    success: 'Comentário atualizado com sucesso!',
    error: 'Erro ao atualizar comentário',
  },
  'task-comment:delete': {
    success: 'Comentário excluído com sucesso!',
    error: 'Erro ao excluir comentário',
  },
};

/**
 * Retorna a configuração de toast para um canal IPC
 */
export function getToastConfig(channel: string): ToastConfig {
  return IPC_TOAST_MESSAGES[channel] || { error: 'Erro na operação' };
}
