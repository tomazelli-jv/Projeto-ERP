import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './auth-context.js';

export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status !== 'authenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }
  return children;
}

RequireAuth.propTypes = { children: PropTypes.node.isRequired };
