import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Paper, Stack } from '@mui/material';
import {
  Work as WorkIcon,
  Groups as GroupsIcon,
  People as PeopleIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';

const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1200,
  width: '100%',
  margin: '0 auto',
}));

interface SystemCard {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const SYSTEM_CARDS: SystemCard[] = [
  {
    label: 'Cargos',
    description: 'Gerencie os cargos e funções disponíveis para os membros.',
    icon: <WorkIcon sx={{ fontSize: 32 }} />,
    path: '/panel/positions',
    color: '#7C3AED',
  },
  {
    label: 'Equipes',
    description: 'Cadastre e organize as equipes do projeto.',
    icon: <GroupsIcon sx={{ fontSize: 32 }} />,
    path: '/panel/teams',
    color: '#0891B2',
  },
  {
    label: 'Membros',
    description: 'Gerencie os membros que compõem as equipes.',
    icon: <PeopleIcon sx={{ fontSize: 32 }} />,
    path: '/panel/team-members',
    color: '#16A34A',
  },
  {
    label: 'Azure DevOps',
    description: 'Configure a integração com o Azure DevOps.',
    icon: <CloudIcon sx={{ fontSize: 32 }} />,
    path: '/panel/azure-devops',
    color: '#2563EB',
  },
];

export function SystemSettingsPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        Sistema
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Cadastros e configurações do sistema
      </Typography>

      <Grid container spacing={2.5} justifyContent="center">
        {SYSTEM_CARDS.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.path}>
            <Paper
              elevation={0}
              onClick={() => navigate(card.path)}
              sx={(theme) => ({
                p: 2.5,
                height: '100%',
                cursor: 'pointer',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                transition: 'all 0.2s ease',
                display: 'flex',
                '&:hover': {
                  borderColor: card.color,
                  bgcolor: alpha(card.color, 0.04),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha(card.color, 0.15)}`,
                },
              })}
            >
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(card.color, 0.1),
                    color: card.color,
                  }}
                >
                  {card.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {card.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.25 }}
                  >
                    {card.description}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </PageContainer>
  );
}

export default SystemSettingsPage;
