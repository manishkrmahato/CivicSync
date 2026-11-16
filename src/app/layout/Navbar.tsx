import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { LogOut, ShieldCheck, User as UserIcon, BarChart3, AlertCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, role, signOut, isConfigured } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Mark */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded bg-forest-700 flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm group-hover:bg-forest-800 transition-colors">
                CS
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-semibold text-lg text-stone-900 tracking-tight leading-none">
                  CivicSync
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-forest-700 font-semibold mt-0.5">
                  Public Infrastructure Service
                </span>
              </div>
            </Link>

            {/* Main Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-stone-200">
              <Link
                to="/transparency"
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  isActive('/transparency')
                    ? 'bg-stone-200 text-stone-900 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Transparency Dashboard
              </Link>

              {user && (role === 'citizen' || role === 'public') && (
                <Link
                  to="/citizen"
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                    isActive('/citizen')
                      ? 'bg-stone-200 text-stone-900 font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Citizen Portal
                </Link>
              )}

              {user && (role === 'official' || role === 'department_staff' || role === 'admin') && (
                <Link
                  to="/official"
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                    isActive('/official')
                      ? 'bg-forest-100 text-forest-900 font-semibold'
                      : 'text-forest-800 hover:text-forest-950 hover:bg-forest-50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Official Console
                </Link>
              )}
            </nav>
          </div>

          {/* Right Section: Auth State / Actions */}
          <div className="flex items-center gap-3">
            {!isConfigured && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" /> DB Config Pending
              </span>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-medium text-stone-900 truncate max-w-[150px]">
                    {profile?.full_name || user.email}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                    {role.replace('_', ' ')}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="flex items-center gap-1 text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Log In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" className="text-xs">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
