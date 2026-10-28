/**
 * Frontend client helper for routing calculations.
 * Calls Annapurna's authenticated server-side /api/routing endpoint.
 * Never calls third-party routing APIs directly from the browser.
 */

export interface RouteSummary {
  distanceKm: number;
  durationMin: number;
  geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export async function getRouteBetweenAddresses(
  origin: string,
  destination: string
): Promise<RouteSummary | null> {
  try {
    const res = await fetch(
      `/api/routing?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    );

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    if (json?.data) {
      return {
        distanceKm: json.data.distanceKm,
        durationMin: json.data.durationMinutes,
        geometry: json.data.geometry,
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch route:', err);
    return null;
  }
}
