import { createBrowserRouter } from 'react-router';
import { FoundationPage } from '../pages/FoundationPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

export const router = createBrowserRouter([
  { path: '/', element: <FoundationPage /> },
  { path: '*', element: <NotFoundPage /> }
]);
