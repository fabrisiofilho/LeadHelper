import { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Popover,
  IconButton,
  InputAdornment,
  Typography,
  Tooltip,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { IconPickerContainer, IconGrid, IconItem } from './styles';

// Lista de ícones mais comuns para categorias
const CATEGORY_ICONS = [
  // Alimentação
  'Restaurant',
  'Fastfood',
  'LocalCafe',
  'LocalBar',
  'LocalPizza',
  'Icecream',
  'BakeryDining',
  'LunchDining',
  // Transporte
  'DirectionsCar',
  'DirectionsBus',
  'Train',
  'Flight',
  'LocalGasStation',
  'TwoWheeler',
  'Commute',
  'LocalTaxi',
  // Casa
  'Home',
  'House',
  'Apartment',
  'Bed',
  'Chair',
  'Kitchen',
  'Bathtub',
  'Lightbulb',
  // Compras
  'ShoppingCart',
  'ShoppingBag',
  'Store',
  'LocalMall',
  'Storefront',
  'CardGiftcard',
  'Redeem',
  'LocalOffer',
  // Saúde
  'LocalHospital',
  'MedicalServices',
  'Medication',
  'HealthAndSafety',
  'FitnessCenter',
  'SportsGymnastics',
  'Spa',
  'Psychology',
  // Educação
  'School',
  'MenuBook',
  'AutoStories',
  'LibraryBooks',
  'Science',
  'Calculate',
  'Translate',
  'HistoryEdu',
  // Entretenimento
  'Movie',
  'MusicNote',
  'SportsEsports',
  'Casino',
  'TheaterComedy',
  'Celebration',
  'NightLife',
  'Park',
  // Trabalho
  'Work',
  'BusinessCenter',
  'Computer',
  'Laptop',
  'Smartphone',
  'Headphones',
  'Print',
  'AttachMoney',
  // Finanças
  'AccountBalance',
  'Savings',
  'CreditCard',
  'Payment',
  'Receipt',
  'TrendingUp',
  'TrendingDown',
  'PriceCheck',
  // Serviços
  'Wifi',
  'PhoneAndroid',
  'Tv',
  'WaterDrop',
  'ElectricBolt',
  'LocalLaundryService',
  'CleaningServices',
  'Build',
  // Viagem
  'BeachAccess',
  'Pool',
  'Luggage',
  'Map',
  'Explore',
  'Hiking',
  'Terrain',
  'Sailing',
  // Pets
  'Pets',
  'Cruelty Free',
  // Outros
  'Category',
  'Star',
  'Favorite',
  'Flag',
  'Bookmark',
  'Label',
  'LocalActivity',
  'MoreHoriz',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
}

export function IconPicker({
  value,
  onChange,
  label = 'Ícone',
  placeholder = 'Selecione um ícone',
  error,
  helperText,
}: IconPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch('');
  };

  const handleSelectIcon = (iconName: string) => {
    onChange(iconName);
    handleClose();
  };

  const filteredIcons = useMemo(() => {
    if (!search) return CATEGORY_ICONS;
    const searchLower = search.toLowerCase();
    return CATEGORY_ICONS.filter((icon) =>
      icon.toLowerCase().includes(searchLower),
    );
  }, [search]);

  const SelectedIcon = value
    ? (MuiIcons as Record<string, React.ComponentType>)[value]
    : null;

  const open = Boolean(anchorEl);

  return (
    <>
      <TextField
        label={label}
        placeholder={placeholder}
        value={value || ''}
        onClick={handleClick}
        error={error}
        helperText={helperText || 'Clique para selecionar um ícone'}
        fullWidth
        slotProps={{
          input: {
            readOnly: true,
            startAdornment: SelectedIcon ? (
              <InputAdornment position="start">
                <SelectedIcon />
              </InputAdornment>
            ) : null,
          },
        }}
        sx={{ cursor: 'pointer' }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <IconPickerContainer>
          <TextField
            placeholder="Buscar ícone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            autoFocus
            sx={{ mb: 1.5 }}
          />

          {value && (
            <Box
              sx={{
                mb: 1.5,
                p: 1,
                bgcolor: 'action.selected',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Selecionado: {value}
              </Typography>
              <IconButton size="small" onClick={() => onChange('')}>
                <MuiIcons.Close fontSize="small" />
              </IconButton>
            </Box>
          )}

          <IconGrid>
            {filteredIcons.map((iconName) => {
              const IconComponent = (
                MuiIcons as Record<string, React.ComponentType>
              )[iconName];
              if (!IconComponent) return null;

              return (
                <Tooltip key={iconName} title={iconName} arrow>
                  <IconItem
                    onClick={() => handleSelectIcon(iconName)}
                    $selected={value === iconName}
                  >
                    <IconComponent />
                  </IconItem>
                </Tooltip>
              );
            })}
          </IconGrid>

          {filteredIcons.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              py={2}
            >
              Nenhum ícone encontrado
            </Typography>
          )}
        </IconPickerContainer>
      </Popover>
    </>
  );
}
