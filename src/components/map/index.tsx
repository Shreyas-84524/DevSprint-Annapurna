"use client";

import dynamic from "next/dynamic";

// Next.js SSR crashes with Leaflet because it relies on the browser 'window' object.
// We MUST dynamically import the MapView component with SSR disabled.
export const DynamicMap = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">
      Loading map interface...
    </div>
  ),
});
