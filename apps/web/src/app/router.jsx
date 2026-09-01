import { Navigate, createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { ModulePage } from '../pages/ModulePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { AccountPage } from '../pages/AccountPage.jsx';
import { CompaniesPage } from '../pages/CompaniesPage.jsx';
import { RequireAuth } from './auth/RequireAuth.jsx';
import { modulePages } from './navigation.js';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'account', element: <AccountPage /> },
      // Empresas possui implementação real; as demais rotas de módulo continuam usando o placeholder compartilhado.
      { path: 'admin/companies', element: <CompaniesPage /> },
      ...modulePages
        .filter((page) => page.path !== '/admin/companies')
        .map((page) => ({
          path: page.path.slice(1),
          element: <ModulePage {...page} />
        }))
    ]
  },
  { path: '*', element: <NotFoundPage /> }
]);
