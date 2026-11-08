import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getDonorListingsErrorMessage,
  parseDonorListingsResponse,
} from "../src/app/dashboard/donor/listingReadModel";

const listing = {
  id: "listing-1",
  donorId: "donor-1",
  title: "Fresh meals",
  description: null,
  quantity: 8,
  unit: "servings",
  foodType: "veg",
  dietaryTags: ["fresh"],
  status: "published",
  expiresAt: "2026-11-09T18:00:00.000Z",
  pickupLocationId: "location-1",
  generalArea: "Central Mumbai",
  rowVersion: 1,
  imageUrl: null,
  createdAt: "2026-11-09T10:00:00.000Z",
  updatedAt: "2026-11-09T10:00:00.000Z",
};

describe("Donor listings frontend read model", () => {
  it("accepts the authenticated donor ListingDTO envelope", () => {
    assert.deepEqual(parseDonorListingsResponse({ data: [listing], error: null }), [listing]);
  });

  it("rejects empty or duplicate IDs before React can render duplicate keys", () => {
    assert.throws(
      () => parseDonorListingsResponse({ data: [{ ...listing, id: "" }], error: null }),
      /expected donor listing contract/
    );
    assert.throws(
      () => parseDonorListingsResponse({ data: [listing, { ...listing }], error: null }),
      /duplicate listing ID/
    );
  });

  it("rejects malformed success envelopes instead of treating them as empty data", () => {
    assert.throws(() => parseDonorListingsResponse({ data: null, error: null }), /data array/);
    assert.throws(
      () => parseDonorListingsResponse({ data: [{ ...listing, quantity: "8" }], error: null }),
      /expected donor listing contract/
    );
  });

  it("distinguishes authentication, permission, and server errors", () => {
    assert.match(getDonorListingsErrorMessage(401, null), /session has expired/i);
    assert.match(getDonorListingsErrorMessage(403, null), /permission/i);
    assert.match(getDonorListingsErrorMessage(500, null), /temporarily unavailable/i);
  });

  it("uses the donor API and never reads food_listings directly in the browser", () => {
    const source = readFileSync(
      new URL("../src/app/dashboard/donor/page.tsx", import.meta.url),
      "utf8"
    );

    assert.match(source, /fetch\("\/api\/listings\?mine=true"/);
    assert.match(source, /credentials: "same-origin"/);
    assert.doesNotMatch(source, /\.from\("food_listings"\)/);
    assert.doesNotMatch(source, /setIsOffline\(true\)/);
  });
});
