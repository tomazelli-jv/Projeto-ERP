import { Navigate, createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell.jsx';
import { AccountPage } from '../pages/AccountPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { EmployeesPage } from '../pages/EmployeesPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { ModulePage } from '../pages/ModulePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
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
      // Funcionários usa contrato próprio; UsersPage legada permanece desconectada.
      { path: 'admin/employees', element: <EmployeesPage /> },
      // MÃ³dulos permanecem navegÃ¡veis, mas nÃ£o disparam contratos do backend antigo durante a migraÃ§Ã£o.
      ...modulePages.map((page) => ({ path: page.path.slice(1), element: <ModulePage {...page} /> }))
    ]
  },
  { path: '*', element: <NotFoundPage /> }
]);
