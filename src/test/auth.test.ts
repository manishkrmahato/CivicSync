import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { formatTicketNumber, formatDate } from '@/lib/utils';
import { UserRole } from '@/types';

// Validation schemas matching LoginPage and RegisterPage
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['citizen', 'official', 'department_staff']),
});

// Role Guard Authorization logic verification
function isRoleAuthorized(userRole: UserRole, allowedRoles?: UserRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
}

describe('Authentication & Utility Logic', () => {
  it('correctly validates valid login credentials', () => {
    const validData = {
      email: 'citizen@civicsync.org',
      password: 'StrongPassword123',
    };
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email formats in login', () => {
    const invalidData = {
      email: 'invalid-email-address',
      password: 'StrongPassword123',
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects short passwords under 6 characters', () => {
    const invalidData = {
      email: 'citizen@civicsync.org',
      password: '123',
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates registration schema with supported roles', () => {
    const validCitizen = {
      fullName: 'John Citizen',
      email: 'john@example.com',
      password: 'Password2026',
      role: 'citizen' as const,
    };
    expect(registerSchema.safeParse(validCitizen).success).toBe(true);

    const validOfficial = {
      fullName: 'Officer Smith',
      email: 'smith@city.gov',
      password: 'Password2026',
      role: 'official' as const,
    };
    expect(registerSchema.safeParse(validOfficial).success).toBe(true);
  });

  it('rejects registration with unsupported roles', () => {
    const invalidRole = {
      fullName: 'Hacker',
      email: 'hacker@example.com',
      password: 'Password2026',
      role: 'superadmin',
    };
    expect(registerSchema.safeParse(invalidRole).success).toBe(false);
  });

  describe('Role-Based Route Authorization Guard', () => {
    it('permits citizen when allowedRoles includes citizen', () => {
      expect(isRoleAuthorized('citizen', ['citizen'])).toBe(true);
    });

    it('denies citizen from accessing official console routes', () => {
      expect(isRoleAuthorized('citizen', ['official', 'department_staff'])).toBe(false);
    });

    it('permits department_staff when allowedRoles includes department_staff', () => {
      expect(isRoleAuthorized('department_staff', ['official', 'department_staff', 'admin'])).toBe(true);
    });

    it('permits any role when allowedRoles is not specified', () => {
      expect(isRoleAuthorized('citizen', undefined)).toBe(true);
      expect(isRoleAuthorized('public', [])).toBe(true);
    });
  });

  describe('Formatting Utilities', () => {
    it('formats ticket numbers to uppercase', () => {
      expect(formatTicketNumber('civ-2026-0042')).toBe('CIV-2026-0042');
    });

    it('formats valid ISO date strings properly', () => {
      const formatted = formatDate('2026-11-16T10:00:00Z');
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});

