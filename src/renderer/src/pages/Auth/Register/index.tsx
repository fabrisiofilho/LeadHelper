import { Grid, Stack, Typography, Link as MuiLink, Card } from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormTextField } from '@renderer/components/Form/FormTextField';
import { useForm } from 'react-hook-form';
import { FormPasswordField } from '@renderer/components/Form/FormPasswordField';
import { LoadingButton } from '@renderer/components/LoadingButton';
import { AuthPageTemplate } from '../components/AuthPageTemplate';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@renderer/redux/slices/auth/thunks';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/redux';
import { isThunkLoading } from '@renderer/utils/thunk';
import { enqueueSnackbar } from 'notistack';
import * as yup from 'yup';

const RegisterCredentialsSchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
  password: yup
    .string()
    .required('Senha é obrigatória')
    .min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: yup
    .string()
    .required('Confirmação de senha é obrigatória')
    .oneOf([yup.ref('password')], 'As senhas não coincidem'),
});

type SubmitData = yup.InferType<typeof RegisterCredentialsSchema>;

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(RegisterCredentialsSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { registerLoading } = useAppSelector((state) => state.auth);
  const loading = isThunkLoading(registerLoading);

  const onSubmit = async (data: SubmitData) => {
    dispatch(
      register({
        name: data.name,
        email: data.email,
        password: data.password,
        cb: (success) => {
          if (!success) return;
          enqueueSnackbar('Conta criada com sucesso!', { variant: 'success' });
          navigate('/login');
        },
      }),
    )
      .unwrap()
      .catch((error) => {
        enqueueSnackbar(error.message || 'Erro ao criar conta', {
          variant: 'error',
        });
      });
  };
  return (
    <AuthPageTemplate>
      <Card sx={{ width: '100%', p: 4 }}>
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <Stack alignItems="center">
            <Typography variant="h4" color="primary" fontWeight={700}>
              Criar Conta
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Preencha os dados abaixo para criar sua conta
            </Typography>
          </Stack>
          <Grid container spacing={2} mt={3}>
            <Grid size={12}>
              <FormTextField
                control={control}
                name="name"
                variant="outlined"
                type="text"
                fullWidth
                label="Nome"
                autoComplete="name"
              />
            </Grid>
            <Grid size={12}>
              <FormTextField
                control={control}
                name="email"
                variant="outlined"
                type="email"
                fullWidth
                label="E-mail"
                autoComplete="email"
              />
            </Grid>
            <Grid size={12}>
              <FormPasswordField
                control={control}
                name="password"
                label="Senha"
                autoComplete="new-password"
                helperText="Mínimo de 6 caracteres"
              />
            </Grid>
            <Grid size={12}>
              <FormPasswordField
                control={control}
                name="confirmPassword"
                label="Confirmar senha"
                autoComplete="new-password"
              />
            </Grid>
            <Grid size={12}>
              <LoadingButton
                loading={loading}
                fullWidth
                variant="contained"
                type="submit"
                size="large"
              >
                Cadastrar
              </LoadingButton>
            </Grid>
            <Grid size={12}>
              <Stack alignItems="center" mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Já tem uma conta?{' '}
                  <MuiLink
                    component={Link}
                    to="/login"
                    underline="hover"
                    sx={{ fontWeight: 600 }}
                  >
                    Entrar
                  </MuiLink>
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Card>
    </AuthPageTemplate>
  );
}
