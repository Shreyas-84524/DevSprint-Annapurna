import {
  FOOD_TYPES,
  LISTING_STATUSES,
  FoodType,
  ListingDTO,
  ListingStatus,
} from "@/types/contracts";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function parseListing(value: unknown): ListingDTO {
  if (!isRecord(value)) {
    throw new Error("Listing response contained a non-object item.");
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const donorId = typeof value.donorId === "string" ? value.donorId.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const quantity = typeof value.quantity === "number" ? value.quantity : Number.NaN;
  const rowVersion = typeof value.rowVersion === "number" ? value.rowVersion : Number.NaN;
  const dietaryTags = Array.isArray(value.dietaryTags)
    ? value.dietaryTags.filter((tag): tag is string => typeof tag === "string")
    : null;

  if (
    !id ||
    !donorId ||
    !title ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    typeof value.unit !== "string" ||
    !FOOD_TYPES.includes(value.foodType as FoodType) ||
    !LISTING_STATUSES.includes(value.status as ListingStatus) ||
    !isNullableString(value.description) ||
    !isNullableString(value.pickupLocationId) ||
    !isNullableString(value.generalArea) ||
    !Number.isInteger(rowVersion) ||
    rowVersion < 1 ||
    dietaryTags === null ||
    typeof value.expiresAt !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("Listing response did not match the expected donor listing contract.");
  }

  return {
    id,
    donorId,
    title,
    description: value.description,
    quantity,
    unit: value.unit,
    foodType: value.foodType as FoodType,
    dietaryTags,
    status: value.status as ListingStatus,
    expiresAt: value.expiresAt,
    pickupLocationId: value.pickupLocationId,
    generalArea: value.generalArea,
    rowVersion,
    imageUrl: isNullableString(value.imageUrl) ? value.imageUrl : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function parseDonorListingsResponse(payload: unknown): ListingDTO[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("Donor listings response did not contain a data array.");
  }

  const seenIds = new Set<string>();
  return payload.data.map((item) => {
    const listing = parseListing(item);
    if (seenIds.has(listing.id)) {
      throw new Error("Donor listings response contained a duplicate listing ID.");
    }
    seenIds.add(listing.id);
    return listing;
  });
}

export function getDonorListingsErrorMessage(status: number, payload: unknown): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "This account does not have permission to view donor listings.";
  if (status >= 500) return "The listing service is temporarily unavailable. Please try again.";

  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  return "Could not load your food listings. Please try again.";
}
