import { Grid, Stack, Typography, Link as MuiLink, Card } from '@mui/material';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormTextField } from '@renderer/components/Form/FormTextField';
import { useForm } from 'react-hook-form';
import { FormPasswordField } from '@renderer/components/Form/FormPasswordField';
import { LoadingButton } from '@renderer/components/LoadingButton';
import { AuthPageTemplate } from '../components/AuthPageTemplate';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '@renderer/redux/slices/auth/thunks';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/redux';
import { isThunkLoading } from '@renderer/utils/thunk';
import { enqueueSnackbar } from 'notistack';
import * as yup from 'yup';

const LoginCredentialsSchema = yup.object({
  email: yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
  password: yup.string().required('Senha é obrigatória'),
});

type SubmitData = yup.InferType<typeof LoginCredentialsSchema>;

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(LoginCredentialsSchema),
  });

  const { loginLoading } = useAppSelector((state) => state.auth);

  const loading = isThunkLoading(loginLoading);

  const onSubmit = async (data: SubmitData) => {
    dispatch(
      login({
        ...data,
        cb: (success) => {
          if (!success) return;

          navigate('/panel/dashboard');
        },
      }),
    )
      .unwrap()
      .catch((error) => {
        enqueueSnackbar(error.message || 'Erro ao fazer login', {
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
              LeadHelper
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Gerencie sua equipe com facilidade
            </Typography>
          </Stack>

          <Grid container spacing={2} mt={3}>
            <Grid size={12}>
              <FormTextField
                control={control}
                name="email"
                variant="outlined"
                type="email"
                fullWidth
                label="E-mail"
              />
            </Grid>

            <Grid size={12}>
              <FormPasswordField
                control={control}
                name="password"
                label="Senha"
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
                Entrar
              </LoadingButton>
            </Grid>

            <Grid size={12}>
              <Stack alignItems="center" mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Não tem uma conta?{' '}
                  <MuiLink
                    component={Link}
                    to="/register"
                    underline="hover"
                    sx={{ fontWeight: 600 }}
                  >
                    Criar Conta
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
