import { CustomMaterialDesignContent } from '@renderer/components/Snackbar';
import { store } from '@renderer/redux/store';
import { GlobalStyle } from '@renderer/styles/global';
import { getMuiTheme } from '@renderer/styles/muiTheme';
import { getStyledTheme } from '@renderer/styles/styledTheme';
import { ThemeProvider as MUIProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider as StyledProvider } from 'styled-components';
import { WithHooks } from '@renderer/hooks';
import { ThemeProvider, useTheme } from '@renderer/hooks/theme';
import { AzureProjectsProvider } from '@renderer/providers/AzureProjectsProvider';

type Props = {
  children: ReactNode;
};

function ThemedApp({ children }: Props) {
  const { themeMode } = useTheme();
  const styledTheme = getStyledTheme(themeMode);
  const muiTheme = getMuiTheme(themeMode);

  return (
    <StyledProvider theme={styledTheme}>
      <GlobalStyle />
      <MUIProvider theme={muiTheme}>
        <SnackbarProvider
          maxSnack={3}
          preventDuplicate
          anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
          Components={{
            success: CustomMaterialDesignContent,
            error: CustomMaterialDesignContent,
            warning: CustomMaterialDesignContent,
            info: CustomMaterialDesignContent,
          }}
        >
          <WithHooks>
            <AzureProjectsProvider>{children}</AzureProjectsProvider>
          </WithHooks>
        </SnackbarProvider>
      </MUIProvider>
    </StyledProvider>
  );
}

export function WithProviders({ children }: Props) {
  return (
    <Provider store={store}>
      <HashRouter>
        <ThemeProvider>
          <ThemedApp>{children}</ThemedApp>
        </ThemeProvider>
      </HashRouter>
    </Provider>
  );
}
