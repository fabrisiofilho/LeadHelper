import { TextField, styled } from '@mui/material';

export const CustomTextField = styled(TextField)({
  '.MuiOutlinedInput-root': {
    padding: '0.563rem !important',
    [`@media (max-width: 600px)`]: {
      padding: '0.375rem !important',
    },
  },
  '.MuiInputLabel-root': {
    paddingRight: '1.5rem',
  },
});
