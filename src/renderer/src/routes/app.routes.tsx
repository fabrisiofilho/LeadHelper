import { LoginPage } from '@renderer/pages/Auth/Login';
import { RegisterPage } from '@renderer/pages/Auth/Register';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PanelRoutes } from './panel.routes';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingPage } from '@renderer/pages/Loading';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoadingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/panel/*" element={<PanelRoutes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
