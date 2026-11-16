import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute';
import { LandingPage } from '@/features/landing/LandingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { CitizenDashboard } from '@/features/dashboard/CitizenDashboard';
import { OfficialDashboard } from '@/features/dashboard/OfficialDashboard';
import { PublicDashboard } from '@/features/dashboard/PublicDashboard';

export const AppRoutes: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/transparency" element={<PublicDashboard />} />

        {/* Role-Protected Citizen Routes */}
        <Route
          path="/citizen"
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />

        {/* Role-Protected Official & Department Staff Routes */}
        <Route
          path="/official"
          element={
            <ProtectedRoute allowedRoles={['official', 'department_staff', 'admin']}>
              <OfficialDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
};

