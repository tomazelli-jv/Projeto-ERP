import { Navigate, createBrowserRouter } from 'react-router';
import { AppShell } from '../components/layout/AppShell.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { ModulePage } from '../pages/ModulePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { modulePages } from './navigation.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate replace to="/dashboard" /> },
      { path: 'dashboard', element: <DashboardPage /> },
      ...modulePages.map((page) => ({
        path: page.path.slice(1),
        element: <ModulePage {...page} />
      }))
    ]
  },
  { path: '*', element: <NotFoundPage /> }
]);
