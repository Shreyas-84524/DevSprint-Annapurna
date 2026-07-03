const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;

// Geocode an address to get [longitude, latitude]
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].geometry.coordinates; // [lon, lat]
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Get distance (in km) and duration (in minutes) between two coordinates
export async function getRouteDetails(startCoords: [number, number], endCoords: [number, number]): Promise<{ distanceKm: number; durationMin: number } | null> {
  try {
    const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startCoords[0]},${startCoords[1]}&end=${endCoords[0]},${endCoords[1]}`);
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const summary = data.features[0].properties.summary;
      return {
        distanceKm: Math.round((summary.distance / 1000) * 10) / 10, // Convert meters to km with 1 decimal
        durationMin: Math.round(summary.duration / 60), // Convert seconds to minutes
      };
    }
    return null;
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

// Convenience function to calculate distance between two addresses directly
export async function getRouteBetweenAddresses(startAddress: string, endAddress: string): Promise<{ distanceKm: number; durationMin: number } | null> {
  const start = await geocodeAddress(startAddress);
  const end = await geocodeAddress(endAddress);
  
  if (!start || !end) return null;
  
  return await getRouteDetails(start, end);
}
