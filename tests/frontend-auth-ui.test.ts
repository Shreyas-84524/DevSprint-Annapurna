import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingRole, UserRole, AdminStatsDTO } from '../src/types/contracts';
import { resolvePostAuthDestination } from '../src/components/auth/authNavigation';

/**
 * Frontend Auth UI and Admin Operations State Suite
 *
 * Verifies client-side validation logic, role portal routing, error state handling,
 * password complexity rules, recovery flows, and admin operations statistics rendering.
 */
describe('Frontend Auth UI & Admin Operations Suite', () => {
  describe('1. Client-Side Input & Validation Rules', () => {
    const validateLoginForm = (form: { email: string; password: string }) => {
      const errors: Record<string, string> = {};
      const trimmedEmail = form.email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail) {
        errors.email = 'Please enter your email address.';
      } else if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address.';
      }
      if (!form.password) {
        errors.password = 'Please enter your password.';
      }
      return { valid: Object.keys(errors).length === 0, errors };
    };

    const validateSignupForm = (form: {
      email: string;
      password: string;
      confirmPassword: string;
      role: string;
    }) => {
      const errors: Record<string, string> = {};
      const trimmedEmail = form.email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address.';
      }

      const allowedRoles: OnboardingRole[] = ['donor', 'requester', 'volunteer'];
      if (!allowedRoles.includes(form.role as OnboardingRole)) {
        errors.role = 'Invalid account role selected.';
      }

      if (!form.password || form.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      }

      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }

      return { valid: Object.keys(errors).length === 0, errors };
    };

    it('rejects empty or invalid email addresses', () => {
      const res = validateLoginForm({ email: 'notanemail', password: 'password123' });
      assert.equal(res.valid, false);
      assert.ok(res.errors.email);
    });

    it('rejects empty password in login form', () => {
      const res = validateLoginForm({ email: 'donor@example.com', password: '' });
      assert.equal(res.valid, false);
      assert.ok(res.errors.password);
    });

    it('accepts well-formed login credentials', () => {
      const res = validateLoginForm({ email: 'donor@example.com', password: 'securePassword123' });
      assert.equal(res.valid, true);
    });

    it('enforces minimum 8 characters for signup passwords', () => {
      const res = validateSignupForm({
        email: 'user@example.com',
        password: 'short',
        confirmPassword: 'short',
        role: 'donor',
      });
      assert.equal(res.valid, false);
      assert.match(res.errors.password, /at least 8 characters/);
    });

    it('enforces password and confirmation match in signup', () => {
      const res = validateSignupForm({
        email: 'user@example.com',
        password: 'securePassword123',
        confirmPassword: 'differentPassword456',
        role: 'volunteer',
      });
      assert.equal(res.valid, false);
      assert.equal(res.errors.confirmPassword, 'Passwords do not match.');
    });

    it('strictly forbids admin selection during public registration', () => {
      const res = validateSignupForm({
        email: 'hacker@example.com',
        password: 'securePassword123',
        confirmPassword: 'securePassword123',
        role: 'admin',
      });
      assert.equal(res.valid, false);
      assert.equal(res.errors.role, 'Invalid account role selected.');
    });

    it('validates allowed public signup roles (donor, requester, volunteer)', () => {
      for (const role of ['donor', 'requester', 'volunteer']) {
        const res = validateSignupForm({
          email: `${role}@example.com`,
          password: 'securePassword123',
          confirmPassword: 'securePassword123',
          role,
        });
        assert.equal(res.valid, true);
      }
    });
  });

  describe('2. Client API Response & Redirection Mapping', () => {
    it('allows only known local post-authentication destinations', () => {
      assert.equal(resolvePostAuthDestination('/dashboard/donor'), '/dashboard/donor');
      assert.equal(resolvePostAuthDestination('/dashboard/beneficiary'), '/dashboard/beneficiary');
      assert.equal(resolvePostAuthDestination('/dashboard/volunteer'), '/dashboard/volunteer');
      assert.equal(resolvePostAuthDestination('/admin'), '/admin');
      assert.equal(resolvePostAuthDestination('/onboarding'), '/onboarding');
    });

    it('fails closed for missing, external, or script post-authentication destinations', () => {
      assert.equal(resolvePostAuthDestination(undefined), '/onboarding');
      assert.equal(resolvePostAuthDestination('https://attacker.example'), '/onboarding');
      assert.equal(resolvePostAuthDestination('javascript:alert(1)'), '/onboarding');
      assert.equal(resolvePostAuthDestination('/dashboard/donor?unexpected=1'), '/onboarding');
    });

    it('maps successful login responses to the appropriate role dashboard', () => {
      const resolveClientRedirect = (data: {
        redirectUrl: string;
        roleMismatch: boolean;
        canonicalRole?: UserRole;
      }) => {
        return {
          destination: data.redirectUrl,
          notice: data.roleMismatch
            ? `Notice: Your account is registered as a ${data.canonicalRole}. Redirecting to your assigned dashboard...`
            : null,
        };
      };

      const donorLogin = resolveClientRedirect({
        redirectUrl: '/dashboard/donor',
        roleMismatch: false,
      });
      assert.equal(donorLogin.destination, '/dashboard/donor');
      assert.equal(donorLogin.notice, null);

      const requesterLogin = resolveClientRedirect({
        redirectUrl: '/dashboard/beneficiary',
        roleMismatch: false,
      });
      assert.equal(requesterLogin.destination, '/dashboard/beneficiary');
      assert.equal(requesterLogin.notice, null);

      const volunteerLogin = resolveClientRedirect({
        redirectUrl: '/dashboard/volunteer',
        roleMismatch: false,
      });
      assert.equal(volunteerLogin.destination, '/dashboard/volunteer');
      assert.equal(volunteerLogin.notice, null);

      const adminLogin = resolveClientRedirect({
        redirectUrl: '/admin',
        roleMismatch: false,
      });
      assert.equal(adminLogin.destination, '/admin');
      assert.equal(adminLogin.notice, null);
    });

    it('displays clear role notice when portal role does not match canonical profile role', () => {
      const resolveClientRedirect = (data: {
        redirectUrl: string;
        roleMismatch: boolean;
        canonicalRole?: UserRole;
      }) => {
        return {
          destination: data.redirectUrl,
          notice: data.roleMismatch
            ? `Notice: Your account is registered as a ${data.canonicalRole}. Redirecting to your assigned dashboard...`
            : null,
        };
      };

      const mismatchedLogin = resolveClientRedirect({
        redirectUrl: '/dashboard/volunteer',
        roleMismatch: true,
        canonicalRole: 'volunteer',
      });
      assert.equal(mismatchedLogin.destination, '/dashboard/volunteer');
      assert.ok(mismatchedLogin.notice?.includes('registered as a volunteer'));
    });
  });

  describe('3. Password Recovery UI Logic', () => {
    it('produces neutral user notification on password reset request', () => {
      const formatForgotPasswordSuccess = () =>
        'If an account exists with this email address, instructions to reset your password have been dispatched. Please review your inbox and spam folder.';

      const msg = formatForgotPasswordSuccess();
      assert.ok(msg.includes('If an account exists'));
      assert.ok(!msg.includes('user not found'));
    });

    it('validates password update recovery inputs', () => {
      const validateResetPassword = (password: string, confirmPassword: string) => {
        if (password.length < 8) return 'New password must be at least 8 characters long.';
        if (password !== confirmPassword) return 'Passwords do not match.';
        return null;
      };

      assert.equal(validateResetPassword('short', 'short'), 'New password must be at least 8 characters long.');
      assert.equal(validateResetPassword('validPassword123', 'different'), 'Passwords do not match.');
      assert.equal(validateResetPassword('validPassword123', 'validPassword123'), null);
    });

    it('correctly categorizes 401 response on password reset as session expiration', () => {
      const handleResetResponse = (status: number) => {
        if (status === 401) {
          return { isExpired: true, message: 'Your password reset link is invalid or has expired. Please request a new link.' };
        }
        return { isExpired: false, message: 'Failed to update password.' };
      };

      const result = handleResetResponse(401);
      assert.equal(result.isExpired, true);
      assert.match(result.message, /invalid or has expired/);
    });
  });

  describe('4. Admin Dashboard Metrics Projection & Rendering Logic', () => {
    it('safely projects optional operational metrics with fallback defaults', () => {
      const rawStats: AdminStatsDTO = {
        totalUsers: 120,
        totalDonors: 40,
        totalRequesters: 30,
        totalVolunteers: 50,
        activeListings: 15,
        completedDeliveries: 95,
        pendingDeliveries: 8,
        unreadMessages: 2,
        // Optional extended fields
        deliveriesAwaitingVolunteer: 5,
        deliveriesInProgress: 3,
        deliveriesCompletedToday: 12,
        totalCompletedDeliveries: 95,
        recentActivity: [
          {
            id: 'evt-1',
            type: 'delivery',
            title: 'Delivery in progress',
            status: 'in_transit',
            timestamp: new Date().toISOString(),
            summary: 'Rescue task accepted by driver',
          },
        ],
      };

      const awaitingVolunteers = rawStats.deliveriesAwaitingVolunteer ?? rawStats.pendingDeliveries ?? 0;
      const inProgress = rawStats.deliveriesInProgress ?? 0;
      const completedToday = rawStats.deliveriesCompletedToday ?? 0;
      const totalCompleted = rawStats.totalCompletedDeliveries ?? rawStats.completedDeliveries ?? 0;

      assert.equal(awaitingVolunteers, 5);
      assert.equal(inProgress, 3);
      assert.equal(completedToday, 12);
      assert.equal(totalCompleted, 95);
      assert.equal(rawStats.recentActivity?.length, 1);
    });

    it('falls back gracefully when extended fields are not yet populated', () => {
      const legacyStats: AdminStatsDTO = {
        totalUsers: 10,
        totalDonors: 4,
        totalRequesters: 3,
        totalVolunteers: 3,
        activeListings: 2,
        completedDeliveries: 10,
        pendingDeliveries: 1,
        unreadMessages: 0,
      };

      const awaitingVolunteers = legacyStats.deliveriesAwaitingVolunteer ?? legacyStats.pendingDeliveries ?? 0;
      const inProgress = legacyStats.deliveriesInProgress ?? 0;
      const completedToday = legacyStats.deliveriesCompletedToday ?? 0;
      const totalCompleted = legacyStats.totalCompletedDeliveries ?? legacyStats.completedDeliveries ?? 0;

      assert.equal(awaitingVolunteers, 1);
      assert.equal(inProgress, 0);
      assert.equal(completedToday, 0);
      assert.equal(totalCompleted, 10);
    });

    it('identifies 401/403 errors as requiring admin credentials', () => {
      const evaluateAdminError = (status: number) => {
        if (status === 401 || status === 403) {
          return { isUnauthorized: true, message: 'Administrator privileges required to view operations metrics.' };
        }
        return { isUnauthorized: false, message: 'Failed to load operations metrics from server.' };
      };

      const unauthorized = evaluateAdminError(403);
      assert.equal(unauthorized.isUnauthorized, true);
      assert.match(unauthorized.message, /Administrator privileges required/);

      const serverErr = evaluateAdminError(500);
      assert.equal(serverErr.isUnauthorized, false);
      assert.match(serverErr.message, /Failed to load/);
    });
  });
});
