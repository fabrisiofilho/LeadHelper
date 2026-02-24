export interface Transfer {
  id: number;
  userId: number;
  fromAccountId: number;
  toAccountId: number;
  fromAccountName?: string;
  toAccountName?: string;
  amount: number;
  fromCurrencyId?: number;
  toCurrencyId?: number;
  fromCurrencyCode?: string;
  toCurrencyCode?: string;
  exchangeRate: number;
  convertedAmount?: number;
  description?: string;
  transferDate: Date;
  fromTransactionId?: number;
  toTransactionId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransferInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string;
  transferDate: Date;
  exchangeRate?: number;
}

export interface UpdateTransferInput {
  amount?: number;
  description?: string;
  transferDate?: Date;
}

export interface TransferFilters {
  startDate?: Date;
  endDate?: Date;
  fromAccountId?: number;
  toAccountId?: number;
  page?: number;
  size?: number;
}

export interface TransferSummary {
  totalTransfers: number;
  totalAmount: number;
  byAccount: {
    accountId: number;
    accountName: string;
    incoming: number;
    outgoing: number;
    net: number;
  }[];
}
