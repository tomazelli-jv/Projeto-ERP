import { Navigate, createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell.jsx';
import { AccountPage } from '../pages/AccountPage.jsx';
import { SettingsPage } from '../pages/SettingsPage.jsx';
import { PlansPage } from '../pages/PlansPage.jsx';
import { CompaniesPage } from '../pages/CompaniesPage.jsx';
import { UsersPage } from '../pages/UsersPage.jsx';
import { UserEditorPage } from '../pages/UserEditorPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
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
      // URLs históricas agora apontam para páginas dedicadas de Configurações.
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin/plan', element: <PlansPage /> },
      // Área existente conectada aos contratos oficiais Empresa/Loja.
      { path: 'admin/companies', element: <CompaniesPage /> },
      // Usuários mantém a URL administrativa; o contrato Funcionario fica encapsulado no client.
      { path: 'admin/users', element: <UsersPage /> },
      { path: 'admin/users/new', element: <UserEditorPage mode="create" /> },
      { path: 'admin/users/:id', element: <UserEditorPage mode="view" /> },
      { path: 'admin/users/:id/edit', element: <UserEditorPage mode="edit" /> },
      // MÃ³dulos permanecem navegÃ¡veis, mas nÃ£o disparam contratos do backend antigo durante a migraÃ§Ã£o.
      ...modulePages.map((page) => ({ path: page.path.slice(1), element: <ModulePage {...page} /> }))
    ]
  },
  { path: '*', element: <NotFoundPage /> }
]);
