import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-forest-700 border-r-transparent align-[-0.125em]" />
          <p className="mt-3 text-sm text-stone-600 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated users to login with the return URL preserved
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Role mismatch: send to their designated dashboard or unauthorized screen
    if (role === 'official' || role === 'admin') {
      return <Navigate to="/official" replace />;
    }
    if (role === 'department_staff') {
      return <Navigate to="/official" replace />;
    }
    return <Navigate to="/citizen" replace />;
  }

  return <>{children}</>;
};

