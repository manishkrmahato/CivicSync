import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ConfigAlert } from '@/components/ui/ConfigAlert';
import { KeyRound, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isConfigured } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof LoginFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validationResult = loginSchema.safeParse(formData);
    if (!validationResult.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof LoginFormData] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(formData.email, formData.password);
    setIsSubmitting(false);

    if (error) {
      setAuthError(error.message);
    } else {
      // Determine redirection based on return URL or default home
      if (from !== '/') {
        navigate(from, { replace: true });
      } else {
        // Redirection handled by AuthContext role or default landing
        navigate('/', { replace: true });
      }
    }
  };

  const handlePreFill = (email: string, pass: string) => {
    setFormData({ email, password: pass });
    setFormErrors({});
    setAuthError(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded bg-forest-700 items-center justify-center text-white font-serif font-bold text-xl mb-3 shadow-sm">
            CS
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            Sign In to CivicSync
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Municipal Infrastructure &amp; Civic Issue Resolution
          </p>
        </div>

        {!isConfigured && <ConfigAlert />}

        <Card className="border-stone-200">
          {authError && (
            <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-900 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="citizen@civicsync.org"
              value={formData.email}
              onChange={handleChange}
              error={formErrors.email}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={formErrors.password}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          {/* Quick-fill helper for evaluation accounts */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              <KeyRound className="w-3.5 h-3.5" /> Pre-configured Demo Credentials
            </div>
            <p className="text-[11px] text-stone-500 mb-3 leading-relaxed">
              Standard email/password accounts configured with role-based policies in Supabase.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => handlePreFill('citizen@civicsync.org', 'CivicSync@2026')}
                className="px-2.5 py-1.5 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-left transition-colors"
              >
                <div className="font-semibold text-stone-900">Citizen Account</div>
                <div className="text-[10px] text-stone-500 truncate">citizen@civicsync.org</div>
              </button>

              <button
                type="button"
                onClick={() => handlePreFill('official@civicsync.org', 'CivicSync@2026')}
                className="px-2.5 py-1.5 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-left transition-colors"
              >
                <div className="font-semibold text-forest-800">Official Account</div>
                <div className="text-[10px] text-stone-500 truncate">official@civicsync.org</div>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-stone-600">
            Do not have an account?{' '}
            <Link to="/register" className="font-semibold text-forest-700 hover:text-forest-900 underline">
              Register here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
