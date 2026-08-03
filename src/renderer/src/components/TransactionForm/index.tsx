import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ToggleButton,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { FormTextField } from '@renderer/components/Form/FormTextField';
import { FormSelectField } from '@renderer/components/Form/FormSelectField';
import { FormDatePickerField } from '@renderer/components/Form/FormDatePickerField';
import { FormCurrencyField } from '@renderer/components/Form/FormCurrencyField';
import type { SelectInputItem } from '@renderer/components/Form/SelectInput';
import { Modal } from '@renderer/components/Modal';
import { formatCurrency } from '@renderer/utils/currency';
import { parseDateSafe } from '@renderer/utils/date';
import type {
  Transaction,
  TransactionType,
  PaymentMethod,
  ExpenseType,
  Recurrence,
  CreateTransactionInput,
} from '@shared/interfaces/types/transaction.types';
import type { Category } from '@shared/interfaces/types/category.types';
import type { Account } from '@shared/interfaces/types/account.types';
import {
  FormContainer,
  FormSection,
  SectionTitle,
  FormGrid,
  FullWidthField,
  TransactionTypeToggle,
  AdditionalOptionsContainer,
  InstallmentsContainer,
  InstallmentText,
  InstallmentPreview,
  FormDivider,
} from './styles';
interface TransactionFormData {
  type: TransactionType;
  description: string;
  amount: number;
  categoryId: number;
  accountId: number;
  transactionDate: Date;
  dueDate?: Date | null;
  paymentMethod?: PaymentMethod;
  expenseType?: ExpenseType;
  recurrence: Recurrence;
  hasInstallments: boolean;
  totalInstallments?: number;
}
interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateTransactionInput) => Promise<void>;
  transaction?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  loading?: boolean;
}
const createValidationSchema = (type: TransactionType) =>
  yup.object().shape({
    type: yup
      .string()
      .oneOf(['income', 'expense'] as const)
      .required('Tipo é obrigatório'),
    description: yup
      .string()
      .required('Descrição é obrigatória')
      .min(3, 'Descrição deve ter no mínimo 3 caracteres')
      .max(100, 'Descrição deve ter no máximo 100 caracteres'),
    amount: yup
      .number()
      .required('Valor é obrigatório')
      .positive('Valor deve ser maior que zero')
      .typeError('Valor inválido'),
    categoryId: yup
      .number()
      .required('Categoria é obrigatória')
      .positive('Selecione uma categoria')
      .typeError('Selecione uma categoria'),
    accountId: yup
      .number()
      .required('Conta é obrigatória')
      .positive('Selecione uma conta')
      .typeError('Selecione uma conta'),
    transactionDate: yup
      .date()
      .required('Data é obrigatória')
      .typeError('Data inválida'),
    dueDate: yup.date().nullable().typeError('Data de vencimento inválida'),
    paymentMethod:
      type === 'expense'
        ? yup
            .string()
            .oneOf(['credit', 'debit', 'pix', 'cash'] as const)
            .required('Forma de pagamento é obrigatória')
        : yup
            .string()
            .oneOf(['credit', 'debit', 'pix', 'cash'] as const)
            .nullable(),
    expenseType:
      type === 'expense'
        ? yup
            .string()
            .oneOf(['fixed', 'variable'] as const)
            .required('Tipo de despesa é obrigatório')
        : yup
            .string()
            .oneOf(['fixed', 'variable'] as const)
            .nullable(),
    recurrence: yup
      .string()
      .oneOf(['once', 'monthly', 'weekly'] as const)
      .required('Recorrência é obrigatória'),
    hasInstallments: yup.boolean(),
    totalInstallments: yup.number().when('hasInstallments', {
      is: true,
      then: (schema) =>
        schema
          .required('Número de parcelas é obrigatório')
          .min(2, 'Mínimo de 2 parcelas')
          .max(48, 'Máximo de 48 parcelas')
          .integer('Número de parcelas deve ser inteiro'),
      otherwise: (schema) => schema.nullable(),
    }),
  });
const paymentMethodOptions: SelectInputItem[] = [
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
];
const expenseTypeOptions: SelectInputItem[] = [
  { value: 'fixed', label: 'Fixa' },
  { value: 'variable', label: 'Variável' },
];
const recurrenceOptions: SelectInputItem[] = [
  { value: 'once', label: 'Única' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
];

export function TransactionForm({
  open,
  onClose,
  onSave,
  transaction,
  categories,
  accounts,
  loading = false,
}: Readonly<TransactionFormProps>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>(
    transaction?.type ?? 'expense',
  );
  const defaultValues: TransactionFormData = useMemo(
    () => ({
      type: transaction?.type ?? 'expense',
      description: transaction?.description ?? '',
      amount: transaction?.amount ?? 0,
      categoryId: transaction?.categoryId ?? 0,
      accountId: transaction?.accountId ?? 0,
      transactionDate: transaction?.transactionDate
        ? (parseDateSafe(transaction.transactionDate) ?? new Date())
        : new Date(),
      dueDate: transaction?.dueDate ? parseDateSafe(transaction.dueDate) : null,
      paymentMethod: transaction?.paymentMethod ?? 'debit',
      expenseType: transaction?.expenseType ?? 'variable',
      recurrence: transaction?.recurrence ?? 'once',
      hasInstallments: (transaction?.totalInstallments ?? 0) > 1,
      totalInstallments: transaction?.totalInstallments ?? 2,
    }),
    [transaction],
  );
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<TransactionFormData>({
    defaultValues,
    resolver: yupResolver(
      createValidationSchema(transactionType),
    ) as Parameters<typeof useForm<TransactionFormData>>[0]['resolver'],
    mode: 'onChange',
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchType = watch('type');
  const watchAmount = watch('amount');
  const watchHasInstallments = watch('hasInstallments');
  const watchTotalInstallments = watch('totalInstallments');
  const watchRecurrence = watch('recurrence');
  const watchPaymentMethod = watch('paymentMethod');
  useEffect(() => {
    setTransactionType(watchType);
  }, [watchType]);
  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setTransactionType(defaultValues.type);
      setSubmitError(null);
    }
  }, [open, defaultValues, reset]);
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => cat.type === transactionType);
  }, [categories, transactionType]);
  const categoryOptions: SelectInputItem[] = useMemo(
    () => [
      { value: 0, label: 'Selecione uma categoria' },
      ...filteredCategories.map((cat) => ({
        value: cat.id,
        label: cat.name,
      })),
    ],
    [filteredCategories],
  );
  const accountOptions: SelectInputItem[] = useMemo(
    () => [
      { value: 0, label: 'Selecione uma conta' },
      ...accounts.map((acc) => ({
        value: acc.id,
        label: acc.name,
      })),
    ],
    [accounts],
  );
  const installmentValue = useMemo(() => {
    if (
      !watchHasInstallments ||
      !watchTotalInstallments ||
      watchTotalInstallments < 2
    ) {
      return 0;
    }
    return watchAmount / watchTotalInstallments;
  }, [watchAmount, watchHasInstallments, watchTotalInstallments]);
  const canHaveInstallments = useMemo(() => {
    return (
      transactionType === 'expense' &&
      watchRecurrence === 'once' &&
      watchPaymentMethod === 'credit'
    );
  }, [transactionType, watchRecurrence, watchPaymentMethod]);
  useEffect(() => {
    if (!canHaveInstallments && watchHasInstallments) {
      setValue('hasInstallments', false);
    }
  }, [canHaveInstallments, watchHasInstallments, setValue]);
  const handleTypeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newType: TransactionType | null) => {
      if (newType) {
        setValue('type', newType);
        setTransactionType(newType);
        setValue('categoryId', 0);
        if (newType === 'income') {
          setValue('paymentMethod', undefined);
          setValue('expenseType', undefined);
          setValue('hasInstallments', false);
        } else {
          setValue('paymentMethod', 'debit');
          setValue('expenseType', 'variable');
        }
      }
    },
    [setValue],
  );
  const onSubmit = async (data: TransactionFormData) => {
    setSubmitError(null);
    try {
      const transactionData: CreateTransactionInput = {
        description: data.description.trim(),
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        accountId: data.accountId,
        transactionDate: data.transactionDate,
        dueDate: data.dueDate ?? undefined,
        recurrence: data.recurrence,
      };
      if (data.type === 'expense') {
        transactionData.paymentMethod = data.paymentMethod;
        transactionData.expenseType = data.expenseType;
        if (
          data.hasInstallments &&
          data.totalInstallments &&
          data.totalInstallments > 1
        ) {
          transactionData.totalInstallments = data.totalInstallments;
        }
      }
      await onSave(transactionData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar transação. Tente novamente.',
      );
    }
  };
  const modalTitle = transaction
    ? 'Editar Transação'
    : transactionType === 'income'
      ? 'Nova Receita'
      : 'Nova Despesa';
  return (
    <Modal
      variant="form"
      open={open}
      title={modalTitle}
      handleClose={onClose}
      handleConfirm={handleSubmit(onSubmit)}
      confirmLabel="Salvar"
      cancelLabel="Cancelar"
      loading={loading || isSubmitting}
      confirmDisabled={loading || isSubmitting}
      setMaxWidth="600px"
      width="100%"
    >
      <FormContainer>
        {}
        {submitError && (
          <Alert severity="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}
        {}
        <FormSection>
          <SectionTitle>Tipo de Transação</SectionTitle>
          <TransactionTypeToggle
            value={watchType}
            exclusive
            onChange={handleTypeChange}
            aria-label="tipo de transação"
          >
            <ToggleButton
              value="income"
              aria-label="receita"
              sx={{
                color:
                  watchType === 'income' ? 'success.main' : 'text.secondary',
                backgroundColor:
                  watchType === 'income' ? 'success.lighter' : 'transparent',
                '&.Mui-selected': {
                  color: 'success.dark',
                  backgroundColor: 'success.lighter',
                  '&:hover': {
                    backgroundColor: 'success.light',
                  },
                },
              }}
            >
              <TrendingUpIcon sx={{ mr: 0.5 }} />
              Receita
            </ToggleButton>
            <ToggleButton
              value="expense"
              aria-label="despesa"
              sx={{
                color:
                  watchType === 'expense' ? 'error.main' : 'text.secondary',
                backgroundColor:
                  watchType === 'expense' ? 'error.lighter' : 'transparent',
                '&.Mui-selected': {
                  color: 'error.dark',
                  backgroundColor: 'error.lighter',
                  '&:hover': {
                    backgroundColor: 'error.light',
                  },
                },
              }}
            >
              <TrendingDownIcon sx={{ mr: 0.5 }} />
              Despesa
            </ToggleButton>
          </TransactionTypeToggle>
        </FormSection>
        <FormDivider />
        {}
        <FormSection>
          <SectionTitle>Informações Básicas</SectionTitle>
          <FormGrid>
            {}
            <FullWidthField>
              <FormTextField
                control={control}
                name="description"
                label="Descrição"
                placeholder="Ex: Salário, Aluguel, Supermercado..."
                required
                fullWidth
              />
            </FullWidthField>
            {}
            <FormCurrencyField
              control={control}
              name="amount"
              label="Valor"
              required
              fullWidth
            />
            {}
            <FormSelectField
              control={control}
              name="categoryId"
              label="Categoria"
              items={categoryOptions}
              required
              fullWidth
            />
            {}
            <FormSelectField
              control={control}
              name="accountId"
              label="Conta"
              items={accountOptions}
              required
              fullWidth
            />
            {}
            <FormDatePickerField
              control={control}
              name="transactionDate"
              label="Data da Transação"
              required
              fullWidth
            />
            {}
            {transactionType === 'expense' && (
              <FormDatePickerField
                control={control}
                name="dueDate"
                label="Data de Vencimento"
                fullWidth
              />
            )}
          </FormGrid>
        </FormSection>
        {}
        {transactionType === 'expense' && (
          <>
            <FormDivider />
            <FormSection>
              <SectionTitle>Detalhes da Despesa</SectionTitle>
              <FormGrid>
                {}
                <FormSelectField
                  control={control}
                  name="paymentMethod"
                  label="Forma de Pagamento"
                  items={paymentMethodOptions}
                  required
                  fullWidth
                />
                {}
                <FormSelectField
                  control={control}
                  name="expenseType"
                  label="Tipo de Despesa"
                  items={expenseTypeOptions}
                  required
                  fullWidth
                />
              </FormGrid>
            </FormSection>
          </>
        )}
        <FormDivider />
        {}
        <FormSection>
          <SectionTitle>Recorrência</SectionTitle>
          <FormGrid>
            <FormSelectField
              control={control}
              name="recurrence"
              label="Frequência"
              items={recurrenceOptions}
              required
              fullWidth
            />
          </FormGrid>
          {watchRecurrence !== 'once' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {watchRecurrence === 'monthly'
                ? 'Esta transação será repetida mensalmente nos próximos 12 meses.'
                : 'Esta transação será repetida semanalmente nas próximas 12 semanas.'}
            </Alert>
          )}
        </FormSection>
        {}
        {transactionType === 'expense' && (
          <>
            <FormDivider />
            <FormSection>
              <SectionTitle>Parcelamento</SectionTitle>
              <AdditionalOptionsContainer>
                <Controller
                  control={control}
                  name="hasInstallments"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          {...field}
                          checked={field.value}
                          disabled={!canHaveInstallments}
                        />
                      }
                      label="Parcelar"
                    />
                  )}
                />
                {watchHasInstallments && canHaveInstallments && (
                  <InstallmentsContainer>
                    <InstallmentText>em</InstallmentText>
                    <Controller
                      control={control}
                      name="totalInstallments"
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          type="number"
                          size="small"
                          sx={{ width: 80 }}
                          inputProps={{ min: 2, max: 48 }}
                          error={!!error}
                          helperText={error?.message}
                        />
                      )}
                    />
                    <InstallmentText>vezes</InstallmentText>
                    {installmentValue > 0 && (
                      <InstallmentPreview>
                        {formatCurrency(installmentValue)} / parcela
                      </InstallmentPreview>
                    )}
                  </InstallmentsContainer>
                )}
              </AdditionalOptionsContainer>
              {!canHaveInstallments && transactionType === 'expense' && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Parcelamento disponível apenas para despesas únicas no cartão
                  de crédito.
                </Typography>
              )}
            </FormSection>
          </>
        )}
      </FormContainer>
    </Modal>
  );
}
export default TransactionForm;
