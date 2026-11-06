import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recordDeliveryLocation, transitionDelivery } from '../src/server/deliveries';
import type { AuthenticatedUser } from '../src/server/auth';

class LifecycleClient {
  status = 'assigned';
  version = 2;
  locations: any[] = [];
  replays = new Map<string, any>();

  rpc = async (name: string, args: any) => {
    if (name === 'record_delivery_location') {
      if (args.p_volunteer_id !== 'volunteer-1' || ['receipt_confirmed', 'cancelled', 'qc_failed'].includes(this.status)) {
        return { data: null, error: { code: '42501', message: 'TRACKING_FORBIDDEN' } };
      }
      const latest = this.locations.at(-1);
      if (latest && args.p_sequence <= latest.sequence) return { data: null, error: { code: '22023', message: 'STALE_SEQUENCE' } };
      const row = { latitude: args.p_latitude, longitude: args.p_longitude, accuracy_m: args.p_accuracy_m, captured_at: args.p_captured_at, sequence: args.p_sequence };
      this.locations.push(row);
      return { data: row, error: null };
    }
    if (name !== 'transition_delivery') return { data: null, error: { code: 'P0001', message: 'UNKNOWN_RPC' } };
    const replayKey = `${args.p_actor_id}:${args.p_action}:${args.p_idempotency_key}`;
    const fingerprint = JSON.stringify([args.p_delivery_id, args.p_action, args.p_payload]);
    const old = this.replays.get(replayKey);
    if (old) {
      if (old.fingerprint !== fingerprint) return { data: null, error: { code: '22023', message: 'IDEMPOTENCY_KEY_REUSED' } };
      return { data: { ...old.response, replayed: true }, error: null };
    }
    if (args.p_expected_version !== null && args.p_expected_version !== this.version) return { data: null, error: { code: '40001', message: 'STALE_ROW_VERSION' } };
    const transitions: Record<string, [string, string, string]> = {
      arrive_pickup: ['assigned', 'at_pickup', 'volunteer-1'],
      qc: ['at_pickup', args.p_payload.result === 'pass' ? 'qc_passed' : 'qc_failed', 'volunteer-1'],
      collect: ['qc_passed', 'collected', 'volunteer-1'],
      start_dropoff: ['collected', 'en_route_dropoff', 'volunteer-1'],
      handover: ['en_route_dropoff', 'handed_over', 'volunteer-1'],
      confirm_receipt: ['handed_over', 'receipt_confirmed', 'requester-1'],
    };
    const transition = transitions[args.p_action];
    if (!transition || transition[0] !== this.status || transition[2] !== args.p_actor_id) return { data: null, error: { code: '42501', message: 'TRANSITION_FORBIDDEN' } };
    this.status = transition[1]; this.version += 1;
    const response = { delivery_id: args.p_delivery_id, status: this.status, row_version: this.version, replayed: false };
    this.replays.set(replayKey, { fingerprint, response });
    return { data: response, error: null };
  };
}

const volunteer: AuthenticatedUser = { id: 'volunteer-1', role: 'volunteer', isVerified: true };
const requester: AuthenticatedUser = { id: 'requester-1', role: 'requester', isVerified: true };

describe('Delivery lifecycle, tracking, and recovery contracts', () => {
  it('completes the authorized QC and handover journey in order', async () => {
    const db = new LifecycleClient();
    const steps: Array<[any, AuthenticatedUser, any]> = [
      ['arrive_pickup', volunteer, {}], ['qc', volunteer, { result: 'pass', notes: 'Safe packaging' }],
      ['collect', volunteer, {}], ['start_dropoff', volunteer, {}], ['handover', volunteer, { evidence: { acknowledged: true } }],
      ['confirm_receipt', requester, {}],
    ];
    for (const [action, actor, payload] of steps) {
      const result = await transitionDelivery('delivery-1', actor, action, { rowVersion: db.version, ...payload }, `key-${action}-123`, db);
      assert.equal(result.status, db.status);
    }
    assert.equal(db.status, 'receipt_confirmed');
  });

  it('rejects out-of-order and wrong-actor transitions', async () => {
    const db = new LifecycleClient();
    await assert.rejects(() => transitionDelivery('delivery-1', requester, 'arrive_pickup', { rowVersion: 2 }, 'wrong-actor-123', db), (error: any) => error.code === 'TRANSITION_FORBIDDEN');
    await assert.rejects(() => transitionDelivery('delivery-1', volunteer, 'collect', { rowVersion: 2 }, 'wrong-state-123', db), (error: any) => error.code === 'TRANSITION_FORBIDDEN');
  });

  it('returns a replay only for the exact same idempotent command', async () => {
    const db = new LifecycleClient();
    const first = await transitionDelivery('delivery-1', volunteer, 'arrive_pickup', { rowVersion: 2 }, 'exact-retry-123', db);
    const replay = await transitionDelivery('delivery-1', volunteer, 'arrive_pickup', { rowVersion: 2 }, 'exact-retry-123', db);
    assert.equal(first.replayed, false); assert.equal(replay.replayed, true);
  });

  it('rejects a stale row version', async () => {
    const db = new LifecycleClient();
    await assert.rejects(() => transitionDelivery('delivery-1', volunteer, 'arrive_pickup', { rowVersion: 1 }, 'stale-version-123', db), (error: any) => error.code === 'STALE_ROW_VERSION');
  });

  it('persists monotonic foreground locations and rejects stale sequence', async () => {
    const db = new LifecycleClient();
    const capturedAt = new Date().toISOString();
    const first = await recordDeliveryLocation('delivery-1', 'volunteer-1', { lat: 19.07, lng: 72.87, accuracyM: 12, capturedAt, sequence: 10 }, db);
    assert.equal(first.sequence, 10);
    await assert.rejects(() => recordDeliveryLocation('delivery-1', 'volunteer-1', { lat: 19.08, lng: 72.88, accuracyM: 10, capturedAt, sequence: 9 }, db), (error: any) => error.code === 'INVALID_LOCATION');
  });

  it('stops location persistence after a terminal state', async () => {
    const db = new LifecycleClient(); db.status = 'receipt_confirmed';
    await assert.rejects(() => recordDeliveryLocation('delivery-1', 'volunteer-1', { lat: 19.07, lng: 72.87, accuracyM: 12, capturedAt: new Date().toISOString(), sequence: 1 }, db), (error: any) => error.code === 'TRACKING_FORBIDDEN');
  });
});
