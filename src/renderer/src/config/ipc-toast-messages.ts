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
};

/**
 * Retorna a configuração de toast para um canal IPC
 */
export function getToastConfig(channel: string): ToastConfig {
  return IPC_TOAST_MESSAGES[channel] || { error: 'Erro na operação' };
}
