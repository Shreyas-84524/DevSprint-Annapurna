/**
 * Server-only Onboarding, Identity & Profile Service
 *
 * Implements canonical onboarding, role enforcement, profile initialization,
 * and current user DTO projections (GET /api/me).
 */

import { createClient as createServerSupabaseClient } from '@/lib/supabase-server';
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
 * Rejects 'admin' role self-assignment and prevents multiple profile creation.
 */
export async function createCanonicalProfile(
  userId: string,
  userEmail: string,
  input: OnboardingProfileRequest,
  customSupabaseClient?: any
): Promise<OnboardingProfileResponse> {
  const supabase = customSupabaseClient || (await createServerSupabaseClient());

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

  // 3. Check for existing profile (prevent duplicates/re-onboarding)
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    // If not a "not found" error, log and handle
    console.error('Error checking existing profile:', checkError);
  }

  if (existingProfile) {
    throw new OnboardingError(
      'A profile has already been onboarded for this account.',
      'PROFILE_ALREADY_EXISTS',
      409
    );
  }

  // 4. Determine verification status
  // Volunteers do NOT require phone OTP verification
  // Donors and requesters require OTP verification
  const isVolunteer = input.role === 'volunteer';
  const isVerified = isVolunteer;
  const verifiedAt = isVolunteer ? new Date().toISOString() : null;

  // 5. Insert canonical profile
  const { data: newProfile, error: profileInsertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      display_name: trimmedName,
      role: input.role,
      is_verified: isVerified,
      verified_at: verifiedAt,
    })
    .select('*')
    .single();

  if (profileInsertError) {
    console.error('Failed to insert profile:', profileInsertError);
    throw new OnboardingError(
      'Failed to create profile. Please verify your session and try again.',
      'PROFILE_INSERT_FAILED',
      500
    );
  }

  // 6. Insert location if provided
  let savedLocation: SavedLocationDTO | null = null;
  if (input.location) {
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
    const { data: locData, error: locError } = await supabase
      .from('saved_locations')
      .insert({
        user_id: userId,
        label: trimmedLabel,
        address: address?.trim() || null,
        latitude,
        longitude,
        is_default: true,
      })
      .select('*')
      .single();

    if (!locError && locData) {
      savedLocation = {
        id: locData.id,
        userId: locData.user_id,
        label: locData.label,
        address: locData.address,
        latitude: Number(locData.latitude),
        longitude: Number(locData.longitude),
        isDefault: locData.is_default,
        createdAt: locData.created_at,
        updatedAt: locData.updated_at,
      };
    }
  }

  // 7. Insert volunteer preferences if volunteer
  let volPrefs: VolunteerPreferencesDTO | null = null;
  if (isVolunteer) {
    const vehicleType = input.volunteerPreferences?.vehicleType || 'motorcycle';
    const maxDistanceKm = input.volunteerPreferences?.maxDistanceKm || 10;

    const { data: prefData, error: prefError } = await supabase
      .from('volunteer_preferences')
      .insert({
        user_id: userId,
        vehicle_type: vehicleType,
        max_distance_km: maxDistanceKm,
        is_available: true,
      })
      .select('*')
      .single();

    if (!prefError && prefData) {
      volPrefs = {
        userId: prefData.user_id,
        vehicleType: prefData.vehicle_type,
        maxDistanceKm: Number(prefData.max_distance_km),
        isAvailable: prefData.is_available,
        createdAt: prefData.created_at,
        updatedAt: prefData.updated_at,
      };
    }
  }

  // 8. Determine destination dashboard route
  let dashboardRoute = '/dashboard/donor';
  if (input.role === 'requester') {
    dashboardRoute = isVerified ? '/dashboard/beneficiary' : '/onboarding/verify';
  } else if (input.role === 'donor') {
    dashboardRoute = isVerified ? '/dashboard/donor' : '/onboarding/verify';
  } else if (input.role === 'volunteer') {
    dashboardRoute = '/dashboard/volunteer';
  }

  return {
    profile: {
      id: newProfile.id,
      displayName: newProfile.display_name,
      role: newProfile.role as UserRole,
      isVerified: newProfile.is_verified,
      phone: newProfile.phone,
      createdAt: newProfile.created_at,
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
  let onboardingComplete = true;
  let dashboardRoute = '/dashboard/donor';

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
      dashboardRoute = '/onboarding/verify';
      onboardingComplete = false;
    }
  } else if (profile.role === 'donor') {
    if (profile.is_verified) {
      dashboardRoute = '/dashboard/donor';
      onboardingComplete = true;
    } else {
      dashboardRoute = '/onboarding/verify';
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
