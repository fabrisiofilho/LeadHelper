import { ReactNode } from 'react';
import { PageContainer } from './styles';

interface PageLayoutProps {
  children: ReactNode;
}

/**
 * Componente de layout padronizado para todas as páginas
 * Garante largura máxima consistente e padding uniforme
 */
export function PageLayout({ children }: PageLayoutProps) {
  return <PageContainer>{children}</PageContainer>;
}

export default PageLayout;
