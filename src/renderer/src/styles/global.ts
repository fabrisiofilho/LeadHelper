import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: ${({ theme }) => [theme.FONTS.montserrat, theme.FONTS.sansSerif].join(',')};
  }

  html, body, #root {
    height: 100%;
    width: 100%;
  }

  body {
    background-color: ${({ theme }) => theme.COLORS.background};
    color: ${({ theme }) => theme.COLORS.text};
    transition: background-color 0.2s ease, color 0.2s ease;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
  }

  a {
    font-style: normal;
    font-variant: normal;
    text-decoration: none;
    color: ${({ theme }) => theme.COLORS.primary};

    &:hover {
      text-decoration: underline;
    }
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.COLORS.surfaceAlt};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.COLORS.grey_400};
    border-radius: 4px;

    &:hover {
      background: ${({ theme }) => theme.COLORS.grey_500};
    }
  }

  ::selection {
    background-color: ${({ theme }) => theme.COLORS.primary};
    color: #FFFFFF;
  }

  .MuiInputLabel-root.has-icon-end {
    padding-right: 1.5rem;
  }

  .MuiInputLabel-root.has-two-icons-end {
    padding-right: 3rem;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.COLORS.primary};
    outline-offset: 2px;
  }

  /* Remove setas (spinners) de inputs numéricos */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
`;
