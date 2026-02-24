import { useState } from 'react';
import { Box, Button, Collapse, Typography } from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ReceiptLong as ReceiptLongIcon,
} from '@mui/icons-material';
import { formatDateToShow, parseDateSafe } from '@renderer/utils/date';
import { formatCurrency } from '@renderer/utils/currency';
import type {
  CreditCardInvoice,
  InvoiceStatus,
} from '@shared/interfaces/types/credit-card.types';
import {
  InvoiceContainer,
  InvoiceHeader,
  InvoiceTitle,
  InvoiceStatusBadge,
  InvoiceInfoSection,
  InvoiceAmount,
  InvoiceDueDate,
  TransactionsList,
  TransactionItem,
  TransactionInfo,
  TransactionDescription,
  TransactionDate,
  TransactionAmount,
  InvoiceActions,
  EmptyTransactionsContainer,
  InvoiceSummary,
  SummaryRow,
  SummaryLabel,
  SummaryValue,
} from './styles';

const formatMonthYear = (month: number, year: number): string => {
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return `${months[month - 1]} ${year}`;
};
const getStatusLabel = (status: InvoiceStatus): string => {
  const labels: Record<InvoiceStatus, string> = {
    open: 'Aberta',
    closed: 'Fechada',
    paid: 'Paga',
    overdue: 'Vencida',
  };
  return labels[status];
};
export interface InvoiceDetailsProps {
  invoice: CreditCardInvoice;
  onPayInvoice?: (invoice: CreditCardInvoice) => void;
  showPayButton?: boolean;
  showTransactions?: boolean;
  defaultExpanded?: boolean;
  showSummary?: boolean;
  variant?: 'full' | 'compact';
}
export function InvoiceDetails({
  invoice,
  onPayInvoice,
  showPayButton = true,
  showTransactions = true,
  defaultExpanded = false,
  showSummary = false,
  variant = 'full',
}: InvoiceDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasTransactions =
    invoice.transactions && invoice.transactions.length > 0;
  const canPay = invoice.status !== 'paid';
  const isOverdue = isInvoiceOverdue(invoice);
  function isInvoiceOverdue(inv: CreditCardInvoice): boolean {
    if (inv.status === 'paid') return false;
    const dueDate = parseDateSafe(inv.dueDate);
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }
  const toggleExpansion = () => {
    setIsExpanded((prev) => !prev);
  };
  const handlePayClick = () => {
    if (onPayInvoice) {
      onPayInvoice(invoice);
    }
  };
  const getEffectiveStatus = (): InvoiceStatus => {
    if (invoice.status === 'paid') return 'paid';
    if (isOverdue) return 'overdue';
    return invoice.status;
  };
  return (
    <InvoiceContainer>
      {}
      <InvoiceHeader>
        <InvoiceTitle>
          <ReceiptIcon sx={{ fontSize: 16, mr: 0.5 }} />
          Fatura de {formatMonthYear(invoice.month, invoice.year)}
        </InvoiceTitle>
        <InvoiceStatusBadge $status={getEffectiveStatus()}>
          {getStatusLabel(getEffectiveStatus())}
        </InvoiceStatusBadge>
      </InvoiceHeader>
      {}
      {showSummary && (
        <InvoiceSummary>
          <SummaryRow>
            <SummaryLabel>Período</SummaryLabel>
            <SummaryValue>
              {formatMonthYear(invoice.month, invoice.year)}
            </SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Vencimento</SummaryLabel>
            <SummaryValue>{formatDateToShow(invoice.dueDate)}</SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Total</SummaryLabel>
            <SummaryValue $highlight>
              {formatCurrency(invoice.totalAmount)}
            </SummaryValue>
          </SummaryRow>
          {hasTransactions && (
            <SummaryRow>
              <SummaryLabel>Transações</SummaryLabel>
              <SummaryValue>{invoice.transactions!.length}</SummaryValue>
            </SummaryRow>
          )}
        </InvoiceSummary>
      )}
      {}
      {variant === 'full' && (
        <InvoiceInfoSection>
          <Box>
            <InvoiceAmount>{formatCurrency(invoice.totalAmount)}</InvoiceAmount>
            <InvoiceDueDate $isOverdue={isOverdue}>
              Vencimento: {formatDateToShow(invoice.dueDate)}
            </InvoiceDueDate>
          </Box>
        </InvoiceInfoSection>
      )}
      {}
      {showTransactions && hasTransactions && (
        <>
          <Button
            size="small"
            onClick={toggleExpansion}
            endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            {isExpanded
              ? 'Ocultar transações'
              : `Ver ${invoice.transactions!.length} transações`}
          </Button>
          <Collapse in={isExpanded}>
            <TransactionsList>
              {invoice.transactions!.map((transaction) => (
                <TransactionItem key={transaction.id}>
                  <TransactionInfo>
                    <TransactionDescription>
                      {transaction.description}
                    </TransactionDescription>
                    <TransactionDate>
                      {formatDateToShow(transaction.transactionDate)}
                      {transaction.categoryName &&
                        ` • ${transaction.categoryName}`}
                    </TransactionDate>
                  </TransactionInfo>
                  <TransactionAmount>
                    {formatCurrency(transaction.amount)}
                  </TransactionAmount>
                </TransactionItem>
              ))}
            </TransactionsList>
          </Collapse>
        </>
      )}
      {}
      {showTransactions && !hasTransactions && (
        <EmptyTransactionsContainer>
          <ReceiptLongIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            Nenhuma transação nesta fatura
          </Typography>
        </EmptyTransactionsContainer>
      )}
      {}
      {showPayButton && canPay && onPayInvoice && (
        <InvoiceActions>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<PaymentIcon />}
            onClick={handlePayClick}
            sx={{ borderRadius: '0.5rem' }}
          >
            Pagar Fatura
          </Button>
        </InvoiceActions>
      )}
    </InvoiceContainer>
  );
}
export default InvoiceDetails;
