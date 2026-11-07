/**
 * Annapurna Shared API Contracts & Data Transfer Objects
 *
 * Status: Canonical backend contract source.
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

// 10. Food Listing Types & Contracts
export type FoodType = 'veg' | 'non-veg' | 'vegan' | 'other';
export const FOOD_TYPES: readonly FoodType[] = ['veg', 'non-veg', 'vegan', 'other'] as const;

export type ListingStatus =
  | 'draft'
  | 'published'
  | 'claimed'
  | 'in_delivery'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'rejected_qc';

export const LISTING_STATUSES: readonly ListingStatus[] = [
  'draft',
  'published',
  'claimed',
  'in_delivery',
  'completed',
  'expired',
  'cancelled',
  'rejected_qc',
] as const;

export interface CreateListingRequest {
  title: string;
  description?: string | null;
  quantity: number;
  unit: string;
  foodType: FoodType;
  dietaryTags?: string[];
  expiresAt: string;
  pickupLocationId?: string | null;
  preparedImageToken?: string;
  publishImmediately?: boolean;
}

export interface UpdateListingRequest {
  rowVersion: number;
  title?: string;
  description?: string | null;
  quantity?: number;
  unit?: string;
  foodType?: FoodType;
  dietaryTags?: string[];
  expiresAt?: string;
  pickupLocationId?: string | null;
}

export interface ListingImageDTO {
  id: string;
  listingId: string;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  displayOrder: number;
  createdAt: string;
}

export interface ListingDTO {
  id: string;
  donorId: string;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  foodType: FoodType;
  dietaryTags: string[];
  status: ListingStatus;
  expiresAt: string;
  pickupLocationId: string | null;
  generalArea: string | null;
  rowVersion: number;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicListingSummaryDTO {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  foodType: FoodType;
  dietaryTags: string[];
  expiresAt: string;
  area?: string | null;
  city?: string | null;
  distanceKm?: number;
  imageUrl?: string | null;
}

export interface ListingPickupDetailsDTO {
  id: string;
  listingId: string;
  pickupLocationId: string | null;
  pickupAddress: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude: number;
  longitude: number;
  pickupInstructions?: string | null;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListingDetailDTO {
  listing: ListingDTO;
  pickupDetails?: ListingPickupDetailsDTO | null;
  images?: ListingImageDTO[];
}

// 11. Claim Contracts
export type ClaimStatus = 'active' | 'cancelled' | 'fulfilled';
export const CLAIM_STATUSES: readonly ClaimStatus[] = ['active', 'cancelled', 'fulfilled'] as const;

export interface ClaimListingRequest {
  deliveryLocationId?: string;
  dropoffAddress?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  dropoffInstructions?: string;
  dropoffContactPhone?: string;
}

export interface ClaimDTO {
  id: string;
  listingId: string;
  requesterId: string;
  status: ClaimStatus;
  deliveryLocationId: string | null;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffInstructions?: string | null;
  dropoffContactPhone: string;
  idempotencyKey?: string | null;
  claimedAt: string;
  cancelledAt?: string | null;
  fulfilledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimResponseDTO {
  claimId: string;
  deliveryId: string;
  listingId: string;
  status: 'claimed';
  replayed?: boolean;
}

// 12. Delivery Contracts
export type DeliveryStatus =
  | 'awaiting_volunteer'
  | 'assigned'
  | 'at_pickup'
  | 'qc_passed'
  | 'qc_failed'
  | 'collected'
  | 'en_route_dropoff'
  | 'handed_over'
  | 'receipt_confirmed'
  | 'cancelled';

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'awaiting_volunteer',
  'assigned',
  'at_pickup',
  'qc_passed',
  'qc_failed',
  'collected',
  'en_route_dropoff',
  'handed_over',
  'receipt_confirmed',
  'cancelled',
] as const;

export const TERMINAL_DELIVERY_STATES: readonly DeliveryStatus[] = [
  'qc_failed',
  'receipt_confirmed',
  'cancelled',
] as const;

export interface VolunteerTaskSummaryDTO {
  deliveryId: string;
  listingId: string;
  foodTitle: string;
  quantity: number;
  unit: string;
  foodType: FoodType;
  pickupArea: string;
  dropoffArea: string;
  distanceKm?: number;
  expiresAt: string;
  status: DeliveryStatus;
}

export interface AcceptDeliveryTaskRequest {
  deliveryId?: string;
}

export interface AcceptDeliveryResponseDTO {
  deliveryId: string;
  volunteerId: string;
  status: 'assigned';
  replayed?: boolean;
}

export interface DeliveryDTO {
  id: string;
  listingId: string;
  claimId: string;
  donorId: string;
  requesterId: string;
  volunteerId: string | null;
  status: DeliveryStatus;
  assignedAt: string | null;
  atPickupAt: string | null;
  qcPassedAt: string | null;
  qcFailedAt: string | null;
  collectedAt: string | null;
  enRouteDropoffAt: string | null;
  handedOverAt: string | null;
  confirmedReceiptAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDetailDTO {
  id: string;
  listingId: string;
  claimId: string;
  status: DeliveryStatus;
  rowVersion: number;
  donor: {
    id: string;
    displayName: string;
    phone?: string;
  };
  requester: {
    id: string;
    displayName: string;
    phone?: string;
  };
  volunteer?: {
    id: string;
    displayName: string;
    phone?: string;
  } | null;
  listing: ListingDTO;
  pickupLocation?: {
    label?: string;
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string | null;
    contactPhone?: string;
  };
  dropoffLocation?: {
    label?: string;
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string | null;
    contactPhone?: string;
  };
  assignedAt?: string | null;
  allowedNextActions?: DeliveryAction[];
  qc?: DeliveryQcDTO | null;
  latestLocation?: DeliveryLocationDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryEventDTO {
  id: string;
  deliveryId: string;
  actorId: string;
  actorRole: string;
  fromStatus: string | null;
  toStatus: string;
  eventName: string;
  reason?: string | null;
  metadata?: Record<string, any>;
  idempotencyKey?: string | null;
  createdAt: string;
}

export type DeliveryAction =
  | 'arrive_pickup'
  | 'qc'
  | 'collect'
  | 'start_dropoff'
  | 'handover'
  | 'confirm_receipt'
  | 'cancel';

export interface DeliveryTransitionRequest {
  rowVersion?: number;
  result?: 'pass' | 'fail';
  notes?: string;
  reason?: string;
  evidence?: Record<string, string | number | boolean | null>;
}

export interface DeliveryTransitionResponseDTO {
  deliveryId: string;
  status: DeliveryStatus;
  rowVersion: number;
  replayed: boolean;
}

export interface DeliveryQcDTO {
  result: 'pass' | 'fail';
  notes: string | null;
  checkedAt: string;
}

export interface DeliveryLocationInput {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
  sequence: number;
}

export interface DeliveryLocationDTO {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: string;
  sequence: number;
  ageSeconds: number;
  stale: boolean;
}

export interface DeliveryRouteDTO extends RouteCalculationDTO {
  deliveryId: string;
  leg: 'pickup' | 'dropoff';
  cached: boolean;
  providerTimestamp: string;
}

// Convenience Type Aliases
export type ListingSummaryDTO = PublicListingSummaryDTO;
export type AvailableTaskDTO = VolunteerTaskSummaryDTO;


// 12. Notification Contracts
export type NotificationType = 'info' | 'claim' | 'delivery' | 'qc' | 'system';

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationsResponseDTO {
  notifications: NotificationDTO[];
  unreadCount: number;
}

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, any>;
}

// 13. Contact Contracts
export interface ContactSubmissionRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ContactMessageDTO {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
}

// 14. CMS Contracts
export interface BlogPostDTO {
  id: string;
  title: string;
  slug: string;
  content: string;
  imageUrl?: string | null;
  authorId?: string | null;
  categoryId?: string | null;
  status: 'draft' | 'published';
  createdAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface CreateBlogPostRequest {
  title: string;
  slug?: string;
  content: string;
  imageUrl?: string | null;
  categoryId?: string | null;
  status?: 'draft' | 'published';
}

export interface UpdateBlogPostRequest {
  title?: string;
  slug?: string;
  content?: string;
  imageUrl?: string | null;
  categoryId?: string | null;
  status?: 'draft' | 'published';
}

export interface EventDTO {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  date: string;
  location: string;
  imageUrl?: string | null;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  imageUrl?: string | null;
}

export interface FaqDTO {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  createdAt: string;
}

export interface CreateFaqRequest {
  question: string;
  answer: string;
  category?: string;
  displayOrder?: number;
}

export interface UpdateFaqRequest {
  question?: string;
  answer?: string;
  category?: string;
  displayOrder?: number;
}

export interface GalleryItemDTO {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

export interface CreateGalleryItemRequest {
  title: string;
  imageUrl: string;
}

export interface AdminStatsDTO {
  totalUsers: number;
  totalDonors: number;
  totalRequesters: number;
  totalVolunteers: number;
  activeListings: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  unreadMessages: number;
}
