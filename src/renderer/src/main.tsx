import { createRoot } from 'react-dom/client';
import { AppRoutes } from './routes/app.routes';
import { WithProviders } from './providers';

createRoot(document.getElementById('root')!).render(
  <WithProviders>
    <AppRoutes />
  </WithProviders>,
);
