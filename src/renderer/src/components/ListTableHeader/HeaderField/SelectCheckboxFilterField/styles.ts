import { Select, TextField } from '@mui/material';
import { styled as styledMui } from '@mui/material/styles';
import styled from 'styled-components';

type CustomSelectProps = {
  maxWidth: string;
};

export const CustomSelect = styled(Select)<CustomSelectProps>`
  & .MuiSelect-select {
    max-width: ${({ maxWidth }) => maxWidth};
  }
`;

export const CustomTextField = styledMui(TextField)(() => ({
  '.MuiOutlinedInput-root': {
    padding: '0.563rem 1rem !important',
    whiteSpace: 'nowrap',
    flexWrap: 'nowrap',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    [`@media (max-width: 600px)`]: {
      padding: '0.4rem 1rem !important',
    },
  },
  '.MuiInputBase-input': {
    cursor: 'pointer',
    caretColor: 'transparent',
    pointerEvents: 'none',
  },
}));
