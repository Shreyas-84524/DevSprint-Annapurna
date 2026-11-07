/**
 * Server-only Onboarding, Identity & Profile Service
 *
 * Implements canonical onboarding, role enforcement, profile initialization,
 * transactional data creation, and current user DTO projections (GET /api/me).
 */

import { createClient as createServerSupabaseClient } from '@/lib/supabase-server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  OnboardingProfileRequest,
  OnboardingProfileResponse,
  MeResponseData,
  UserRole,
  ONBOARDING_ROLES,
  SavedLocationDTO,
  VolunteerPreferencesDTO,
} from '@/types/contracts';

export class OnboardingError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'OnboardingError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Validates and creates a one-time canonical user profile during onboarding.
 * Ensures profile, required saved location, and volunteer preferences are created
 * transactionally without partial orphan writes.
 */
export async function createCanonicalProfile(
  userId: string,
  userEmail: string,
  input: OnboardingProfileRequest,
  customSupabaseClient?: any
): Promise<OnboardingProfileResponse> {
  const supabase = customSupabaseClient || getServiceRoleClient();

  // 1. Validate display name
  const trimmedName = input.displayName?.trim();
  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
    throw new OnboardingError(
      'Display name is required and must be between 2 and 100 characters.',
      'INVALID_DISPLAY_NAME',
      400
    );
  }

  // 2. Validate role
  if (!input.role) {
    throw new OnboardingError('Role is required for onboarding.', 'MISSING_ROLE', 400);
  }

  if ((input.role as string) === 'admin') {
    throw new OnboardingError(
      'The admin role cannot be self-assigned through onboarding.',
      'ADMIN_ESCALATION_FORBIDDEN',
      403
    );
  }

  if (!ONBOARDING_ROLES.includes(input.role)) {
    throw new OnboardingError(
      `Invalid role '${input.role}'. Allowed roles: ${ONBOARDING_ROLES.join(', ')}.`,
      'INVALID_ROLE',
      400
    );
  }

  // 3. Validate required saved location (mandatory for all onboarding roles)
  if (!input.location) {
    throw new OnboardingError(
      'A valid saved location is required to complete onboarding.',
      'MISSING_LOCATION',
      400
    );
  }

  const { label, address, latitude, longitude } = input.location;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new OnboardingError(
      'Invalid coordinates provided for location.',
      'INVALID_COORDINATES',
      400
    );
  }

  const trimmedLabel = label?.trim() || 'Default Location';

  // 4. Determine verification status: With passwordless email OTP, all onboarded users are verified

  // 5. Perform the entire write through one privileged database transaction.
  const vehicleType = input.volunteerPreferences?.vehicleType || 'motorcycle';
  const maxDistanceKm = input.volunteerPreferences?.maxDistanceKm || 10;

  const { data: txData, error: txError } = await supabase.rpc('complete_onboarding_tx', {
    p_user_id: userId,
    p_display_name: trimmedName,
    p_role: input.role,
    p_location_label: trimmedLabel,
    p_address: address?.trim() || null,
    p_latitude: latitude,
    p_longitude: longitude,
    p_vehicle_type: vehicleType,
    p_max_distance_km: maxDistanceKm,
  });

  if (txError || !txData) {
    const message = txError?.message || '';
    if (message.includes('PROFILE_ALREADY_EXISTS') || txError?.code === '23505') {
      throw new OnboardingError(
        'A profile has already been onboarded for this account.',
        'PROFILE_ALREADY_EXISTS',
        409
      );
    }

    console.error('Transactional onboarding failed:', txError);
    throw new OnboardingError(
      'Failed to create the onboarding profile. No onboarding data was saved.',
      'ONBOARDING_TRANSACTION_FAILED',
      500
    );
  }

  const createdProfile = txData.profile;
  let savedLocation: SavedLocationDTO | null = null;
  let volPrefs: VolunteerPreferencesDTO | null = null;

  if (txData.location) {
    savedLocation = {
      id: txData.location.id,
      userId: txData.location.user_id,
      label: txData.location.label,
      address: txData.location.address,
      latitude: Number(txData.location.latitude),
      longitude: Number(txData.location.longitude),
      isDefault: txData.location.is_default,
      createdAt: txData.location.created_at,
      updatedAt: txData.location.updated_at,
    };
  }

  if (txData.volunteer_preferences) {
    volPrefs = {
      userId: txData.volunteer_preferences.user_id,
      vehicleType: txData.volunteer_preferences.vehicle_type,
      maxDistanceKm: Number(txData.volunteer_preferences.max_distance_km),
      isAvailable: txData.volunteer_preferences.is_available,
      createdAt: txData.volunteer_preferences.created_at,
      updatedAt: txData.volunteer_preferences.updated_at,
    };
  }

  // 6. Determine destination dashboard route
  let dashboardRoute = '/onboarding';
  if (input.role === 'requester') {
    dashboardRoute = '/dashboard/beneficiary';
  } else if (input.role === 'donor') {
    dashboardRoute = '/dashboard/donor';
  } else if (input.role === 'volunteer') {
    dashboardRoute = '/dashboard/volunteer';
  }

  return {
    profile: {
      id: createdProfile.id,
      displayName: createdProfile.display_name,
      role: createdProfile.role as UserRole,
      isVerified: createdProfile.is_verified,
      phone: createdProfile.phone,
      createdAt: createdProfile.created_at,
    },
    location: savedLocation,
    volunteerPreferences: volPrefs,
    dashboardRoute,
  };
}

/**
 * Projects current authenticated user state for GET /api/me.
 */
export async function getCurrentUserProjection(
  userId: string,
  userEmail: string,
  customSupabaseClient?: any
): Promise<MeResponseData> {
  const supabase = customSupabaseClient || (await createServerSupabaseClient());

  // 1. Fetch canonical profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return {
      id: userId,
      email: userEmail,
      displayName: null,
      role: null,
      isVerified: false,
      verifiedAt: null,
      phone: null,
      defaultLocation: null,
      volunteerPreferences: null,
      onboardingComplete: false,
      dashboardRoute: '/onboarding',
    };
  }

  // 2. Fetch default location
  let defaultLocation: SavedLocationDTO | null = null;
  const { data: loc } = await supabase
    .from('saved_locations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (loc) {
    defaultLocation = {
      id: loc.id,
      userId: loc.user_id,
      label: loc.label,
      address: loc.address,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      isDefault: loc.is_default,
      createdAt: loc.created_at,
      updatedAt: loc.updated_at,
    };
  }

  // 3. Fetch volunteer preferences if applicable
  let volPrefs: VolunteerPreferencesDTO | null = null;
  if (profile.role === 'volunteer') {
    const { data: prefs } = await supabase
      .from('volunteer_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefs) {
      volPrefs = {
        userId: prefs.user_id,
        vehicleType: prefs.vehicle_type,
        maxDistanceKm: Number(prefs.max_distance_km),
        isAvailable: prefs.is_available,
        createdAt: prefs.created_at,
        updatedAt: prefs.updated_at,
      };
    }
  }

  // 4. Calculate onboarding and dashboard route
  let onboardingComplete = false;
  let dashboardRoute = '/onboarding';

  if (profile.role === 'admin') {
    dashboardRoute = '/admin';
    onboardingComplete = true;
  } else if (profile.role === 'volunteer') {
    dashboardRoute = '/dashboard/volunteer';
    onboardingComplete = true;
  } else if (profile.role === 'requester') {
    if (profile.is_verified) {
      dashboardRoute = '/dashboard/beneficiary';
      onboardingComplete = true;
    } else {
      dashboardRoute = '/onboarding';
      onboardingComplete = false;
    }
  } else if (profile.role === 'donor') {
    if (profile.is_verified) {
      dashboardRoute = '/dashboard/donor';
      onboardingComplete = true;
    } else {
      dashboardRoute = '/onboarding';
      onboardingComplete = false;
    }
  }

  return {
    id: userId,
    email: userEmail,
    displayName: profile.display_name,
    role: profile.role as UserRole,
    isVerified: profile.is_verified,
    verifiedAt: profile.verified_at,
    phone: profile.phone,
    defaultLocation,
    volunteerPreferences: volPrefs,
    onboardingComplete,
    dashboardRoute,
  };
}
