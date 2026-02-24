import { IconButton, Stack, Tooltip } from '@mui/material';
import {
  AccountBalance as CheckingIcon,
  Savings as SavingsIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as WalletIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import type {
  Account,
  AccountType,
} from '@shared/interfaces/types/account.types';
import {
  AccountCardContainer,
  AccountCardHeader,
  AccountTypeIcon,
  AccountInfo,
  AccountName,
  AccountTypeLabel,
  AccountActions,
  BalanceSection,
  BalanceValue,
  BalanceLabel,
  CreditLimitInfo,
  InfoLabel,
  InfoValue,
  NegativeBalanceIndicator,
} from './styles';
import { formatCurrency } from '@renderer/utils/currency';

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  wallet: 'Carteira',
};
const getAccountIcon = (type: AccountType) => {
  switch (type) {
    case 'checking':
      return <CheckingIcon />;
    case 'savings':
      return <SavingsIcon />;
    case 'credit_card':
      return <CreditCardIcon />;
    case 'wallet':
      return <WalletIcon />;
    default:
      return <WalletIcon />;
  }
};
export interface AccountCardProps {
  account: Account;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
  showActions?: boolean;
}
export function AccountCard({
  account,
  onEdit,
  onDelete,
  showActions = true,
}: AccountCardProps) {
  const hasNegativeBalance = account.balance < 0;
  const isCreditCard = account.type === 'credit_card';
  return (
    <AccountCardContainer $type={account.type}>
      <AccountCardHeader>
        <Stack direction="row" alignItems="center" flex={1} minWidth={0}>
          <AccountTypeIcon $type={account.type}>
            {getAccountIcon(account.type)}
          </AccountTypeIcon>
          <AccountInfo>
            <AccountName>{account.name}</AccountName>
            <AccountTypeLabel>
              {accountTypeLabels[account.type]}
            </AccountTypeLabel>
          </AccountInfo>
        </Stack>
        {showActions && (onEdit || onDelete) && (
          <AccountActions>
            {onEdit && (
              <Tooltip title="Editar">
                <IconButton
                  size="small"
                  onClick={() => onEdit(account)}
                  aria-label="Editar conta"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Excluir">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(account)}
                  aria-label="Excluir conta"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </AccountActions>
        )}
      </AccountCardHeader>
      <BalanceSection>
        <BalanceLabel>Saldo Atual</BalanceLabel>
        <BalanceValue $negative={hasNegativeBalance}>
          {formatCurrency(account.balance)}
        </BalanceValue>
        {}
        {hasNegativeBalance && (
          <NegativeBalanceIndicator>
            <TrendingDownIcon fontSize="small" />
            Saldo negativo
          </NegativeBalanceIndicator>
        )}
        {}
        {isCreditCard && account.creditLimit && (
          <>
            <CreditLimitInfo>
              <InfoLabel>Limite de Crédito</InfoLabel>
              <InfoValue>{formatCurrency(account.creditLimit)}</InfoValue>
            </CreditLimitInfo>
            {account.closingDay && (
              <CreditLimitInfo>
                <InfoLabel>Dia de Fechamento</InfoLabel>
                <InfoValue>Dia {account.closingDay}</InfoValue>
              </CreditLimitInfo>
            )}
          </>
        )}
      </BalanceSection>
    </AccountCardContainer>
  );
}
export default AccountCard;
