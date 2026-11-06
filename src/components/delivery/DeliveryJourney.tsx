"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Navigation, RefreshCw, XCircle } from "lucide-react";
import { DynamicMap } from "@/components/map";
import { createClient } from "@/lib/supabase";
import type { DeliveryAction, DeliveryDetailDTO, DeliveryRouteDTO } from "@/types/contracts";

type JourneyRole = "donor" | "requester" | "volunteer";

export default function DeliveryJourney({
  delivery,
  role,
  onRefresh,
}: {
  delivery: DeliveryDetailDTO;
  role: JourneyRole;
  onRefresh: () => Promise<void> | void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [route, setRoute] = useState<DeliveryRouteDTO | null>(null);
  const [busy, setBusy] = useState<DeliveryAction | "gps" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "sharing" | "denied" | "unsupported">("idle");
  const [qcNotes, setQcNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<{ at: number; lat: number; lng: number } | null>(null);

  const refresh = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    const channel = supabase
      .channel(`delivery-${delivery.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deliveries", filter: `id=eq.${delivery.id}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delivery_locations", filter: `delivery_id=eq.${delivery.id}` }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setError("Live updates disconnected. Use Refresh to restore canonical state.");
      });
    return () => { supabase.removeChannel(channel); };
  }, [delivery.id, refresh, supabase]);

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  const runAction = async (action: DeliveryAction, payload: Record<string, unknown> = {}) => {
    setBusy(action); setError(null); setMessage(null);
    try {
      const path = action.replaceAll("_", "-");
      const response = await fetch(`/api/deliveries/${delivery.id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `${action}-${delivery.id}-${crypto.randomUUID()}` },
        body: JSON.stringify({ rowVersion: delivery.rowVersion, ...payload }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || "The delivery state changed. Refresh and retry.");
      setMessage(`Delivery updated to ${json.data.status.replaceAll("_", " ")}.`);
      await refresh();
    } catch (actionError: any) {
      setError(actionError.message || "Delivery update failed.");
    } finally { setBusy(null); }
  };

  const loadRoute = async () => {
    const leg = ["assigned", "at_pickup", "qc_passed"].includes(delivery.status) ? "pickup" : "dropoff";
    setBusy("gps"); setError(null);
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/route?leg=${leg}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || "Route provider unavailable.");
      setRoute(json.data);
    } catch (routeError: any) {
      setError(routeError.message || "Route provider unavailable. Coordinates remain visible.");
    } finally { setBusy(null); }
  };

  const startGps = () => {
    if (!navigator.geolocation) { setGpsState("unsupported"); return; }
    setGpsState("sharing");
    watchId.current = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      const previous = lastSent.current;
      const moved = previous ? Math.hypot(next.lat - previous.lat, next.lng - previous.lng) * 111000 : Infinity;
      if (previous && now - previous.at < 10000 && moved < 20) return;
      lastSent.current = { at: now, ...next };
      const response = await fetch(`/api/deliveries/${delivery.id}/location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, accuracyM: Math.max(position.coords.accuracy, 1), capturedAt: new Date(position.timestamp).toISOString(), sequence: now }),
      });
      if (!response.ok && response.status !== 429) setError("GPS update was rejected. Refresh the delivery state.");
    }, (gpsError) => {
      setGpsState(gpsError.code === 1 ? "denied" : "idle");
      setError(gpsError.code === 1 ? "Location permission was denied. Enable it in browser settings to share foreground tracking." : "GPS signal is unavailable. Retry when the device has a position fix.");
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  };

  const stopGps = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null; setGpsState("idle");
  };

  const geometry = route?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  const pickup = delivery.pickupLocation ? [delivery.pickupLocation.latitude, delivery.pickupLocation.longitude] as [number, number] : undefined;
  const dropoff = delivery.dropoffLocation ? [delivery.dropoffLocation.latitude, delivery.dropoffLocation.longitude] as [number, number] : undefined;
  const volunteer = delivery.latestLocation ? [delivery.latestLocation.latitude, delivery.latestLocation.longitude] as [number, number] : undefined;

  return (
    <section className="mt-6 space-y-4" aria-label="Delivery journey controls">
      <div className="flex flex-wrap gap-2">
        <button onClick={refresh} className="px-3 py-2 rounded-lg bg-white/10 text-sm flex gap-2 items-center"><RefreshCw size={15}/>Refresh</button>
        <button onClick={loadRoute} disabled={busy === "gps"} className="px-3 py-2 rounded-lg bg-white/10 text-sm flex gap-2 items-center"><Navigation size={15}/>Load route</button>
        {role === "volunteer" && gpsState !== "sharing" && <button onClick={startGps} className="px-3 py-2 rounded-lg bg-brand-gold text-brand-charcoal text-sm font-bold">Start foreground GPS</button>}
        {role === "volunteer" && gpsState === "sharing" && <button onClick={stopGps} className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-bold">Stop GPS</button>}
      </div>

      {message && <p className="p-3 rounded-lg bg-green-500/15 text-green-200 flex gap-2"><CheckCircle2 size={18}/>{message}</p>}
      {error && <p className="p-3 rounded-lg bg-red-500/15 text-red-200 flex gap-2"><AlertTriangle size={18}/>{error}</p>}
      {delivery.latestLocation?.stale && <p className="p-3 rounded-lg bg-amber-500/15 text-amber-200">Volunteer location is stale ({delivery.latestLocation.ageSeconds}s old).</p>}
      {role === "volunteer" && <p className="text-xs text-gray-400">Tracking runs only while this page is open and permission remains granted. Browsers cannot guarantee background GPS.</p>}

      {(pickup || dropoff || volunteer) && (
        <DynamicMap volunteerCoords={volunteer} pickupCoords={pickup} deliveryCoords={dropoff} routeGeometry={geometry}/>
      )}

      <div className="flex flex-wrap gap-2">
        {delivery.allowedNextActions?.includes("arrive_pickup") && <button onClick={() => runAction("arrive_pickup")} disabled={!!busy} className="px-4 py-2 bg-brand-gold text-brand-charcoal rounded-lg font-bold">Arrived at pickup</button>}
        {delivery.allowedNextActions?.includes("collect") && <button onClick={() => runAction("collect")} disabled={!!busy} className="px-4 py-2 bg-brand-gold text-brand-charcoal rounded-lg font-bold">Food collected</button>}
        {delivery.allowedNextActions?.includes("start_dropoff") && <button onClick={() => runAction("start_dropoff")} disabled={!!busy} className="px-4 py-2 bg-brand-gold text-brand-charcoal rounded-lg font-bold">Start drop-off</button>}
        {delivery.allowedNextActions?.includes("handover") && <button onClick={() => runAction("handover", { evidence: { acknowledged: true } })} disabled={!!busy} className="px-4 py-2 bg-brand-gold text-brand-charcoal rounded-lg font-bold">Confirm handover</button>}
        {delivery.allowedNextActions?.includes("confirm_receipt") && <button onClick={() => runAction("confirm_receipt")} disabled={!!busy} className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold">Confirm receipt</button>}
      </div>

      {delivery.allowedNextActions?.includes("qc") && (
        <div className="p-4 rounded-xl bg-white/5 space-y-3">
          <label className="block text-sm font-bold">Food quality check notes</label>
          <textarea value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} maxLength={1000} className="w-full rounded-lg p-3 text-brand-charcoal" placeholder="Packaging, temperature, visible condition…"/>
          <div className="flex gap-2">
            <button onClick={() => runAction("qc", { result: "pass", notes: qcNotes })} className="px-4 py-2 bg-green-500 text-white rounded-lg flex gap-2"><CheckCircle2 size={18}/>Pass QC</button>
            <button onClick={() => runAction("qc", { result: "fail", notes: qcNotes })} className="px-4 py-2 bg-red-500 text-white rounded-lg flex gap-2"><XCircle size={18}/>Fail QC</button>
          </div>
        </div>
      )}

      {delivery.allowedNextActions?.includes("cancel") && (
        <div className="p-4 rounded-xl bg-white/5 flex flex-col sm:flex-row gap-2">
          <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="flex-1 rounded-lg p-3 text-brand-charcoal" placeholder="Cancellation reason"/>
          <button onClick={() => runAction("cancel", { reason: cancelReason })} disabled={!cancelReason.trim() || !!busy} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold">Cancel delivery</button>
        </div>
      )}
    </section>
  );
}
