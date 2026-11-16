import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ConfigAlert } from '@/components/ui/ConfigAlert';
import { UserRole } from '@/types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['citizen', 'official', 'department_staff']),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, isConfigured } = useAuth();

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    password: '',
    role: 'citizen',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof RegisterFormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validationResult = registerSchema.safeParse(formData);
    if (!validationResult.success) {
      const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof RegisterFormData] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.role as UserRole
    );
    setIsSubmitting(false);

    if (error) {
      setAuthError(error.message);
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        if (formData.role === 'official' || formData.role === 'department_staff') {
          navigate('/official');
        } else {
          navigate('/citizen');
        }
      }, 1500);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded bg-forest-700 items-center justify-center text-white font-serif font-bold text-xl mb-3 shadow-sm">
            CS
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            Create a CivicSync Account
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Join the municipal issue reporting and tracking platform
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

          {isSuccess ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-forest-700 mx-auto mb-3" />
              <h2 className="text-lg font-serif font-semibold text-stone-900">
                Registration Successful
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Redirecting to your designated dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                name="fullName"
                type="text"
                placeholder="Jane Citizen"
                value={formData.fullName}
                onChange={handleChange}
                error={formErrors.fullName}
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={handleChange}
                error={formErrors.email}
                required
              />

              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                required
              />

              <div>
                <label
                  htmlFor="role-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Account Role
                </label>
                <select
                  id="role-select"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-600/20 focus:border-forest-600 text-stone-900"
                >
                  <option value="citizen">Citizen / Community Member</option>
                  <option value="official">Authorized Municipal Official (Triage)</option>
                  <option value="department_staff">Department Field Staff</option>
                </select>
                <p className="mt-1 text-[11px] text-stone-500">
                  Select your functional responsibility within the municipal system.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                Complete Registration
              </Button>
            </form>
          )}

          <div className="mt-5 text-center text-xs text-stone-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-forest-700 hover:text-forest-900 underline">
              Sign in here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

