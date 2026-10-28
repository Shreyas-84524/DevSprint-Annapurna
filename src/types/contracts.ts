/**
 * Annapurna Shared API Contracts & Data Transfer Objects
 *
 * Status: Canonical Stage 2 backend contract source.
 * Backend is the designated sole editor for this file.
 * See docs/architecture/API_CONTRACTS.md for API conventions and specs.
 */

// 1. Canonical Roles
export type UserRole = 'donor' | 'requester' | 'volunteer' | 'admin';

export const CANONICAL_ROLES: readonly UserRole[] = [
  'donor',
  'requester',
  'volunteer',
  'admin',
] as const;

export const ONBOARDING_ROLES = ['donor', 'requester', 'volunteer'] as const;
export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

// 2. Standard API Response Envelopes
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any> | null;
  retryAfterSeconds?: number;
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, any>;
}

// 3. User Location DTOs
export interface LocationInput {
  label: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface SavedLocationDTO {
  id: string;
  userId: string;
  label: string;
  address: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// 4. Volunteer Preferences DTOs
export type VehicleType = 'foot' | 'bicycle' | 'motorcycle' | 'car' | 'van' | 'other';

export interface VolunteerPreferencesDTO {
  userId: string;
  vehicleType: VehicleType;
  maxDistanceKm: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// 5. Onboarding Contract
export interface OnboardingProfileRequest {
  displayName: string;
  role: OnboardingRole;
  location?: LocationInput;
  volunteerPreferences?: {
    vehicleType?: VehicleType;
    maxDistanceKm?: number;
  };
}

export interface OnboardingProfileResponse {
  profile: {
    id: string;
    displayName: string;
    role: UserRole;
    isVerified: boolean;
    phone: string | null;
    createdAt: string;
  };
  location?: SavedLocationDTO | null;
  volunteerPreferences?: VolunteerPreferencesDTO | null;
  dashboardRoute: string;
}

// 6. Current User DTO (GET /api/me)
export interface MeResponseData {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole | null;
  isVerified: boolean;
  verifiedAt: string | null;
  phone: string | null;
  defaultLocation: SavedLocationDTO | null;
  volunteerPreferences: VolunteerPreferencesDTO | null;
  onboardingComplete: boolean;
  dashboardRoute: string;
}

// 7. Swift SMS OTP Verification Contracts
export interface SendCodeRequest {
  phone: string;
}

export interface SendCodeResponseData {
  requestId: string;
  phone: string;
  status: 'QUEUED';
  expiresAt: string;
  resendAfter: number;
}

export interface VerifyCodeRequest {
  code: string;
}

export interface VerifyCodeResponseData {
  verified: boolean;
  phone: string;
  isNewUser: boolean;
  proofId: string;
}

// 8. Admin Bootstrap Contract
export interface AdminBootstrapRequest {
  targetUserId: string;
}

export interface AdminBootstrapResponseData {
  success: boolean;
  adminId: string;
  role: 'admin';
  timestamp: string;
}

// 9. Routing Contract (GET /api/routing)
export interface RouteCalculationDTO {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  travelMode: string;
  provider: 'geoapify';
}
