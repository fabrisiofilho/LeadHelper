export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isDefault: boolean;
  exchangeRate: number;
  lastUpdated: Date;
  createdAt: Date;
}

export interface CreateCurrencyInput {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
  exchangeRate?: number;
}

export interface UpdateCurrencyInput {
  name?: string;
  symbol?: string;
  exchangeRate?: number;
}

export interface ExchangeRateUpdate {
  code: string;
  rate: number;
  updatedAt: Date;
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
}
