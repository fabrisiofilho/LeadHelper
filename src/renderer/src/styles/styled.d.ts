import 'styled-components';
import { styledTheme } from '@renderer/styles/styledTheme';

declare module 'styled-components' {
  type ThemeType = typeof styledTheme;

  export interface DefaultTheme extends ThemeType {}
}
