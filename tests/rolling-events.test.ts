import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as refreshEventsHandler } from '../src/app/api/cron/refresh-events/route';

describe('Rolling Events & Content Integration Suite', () => {
  it('rejects unauthenticated requests to cron refresh endpoint', async () => {
    process.env.CRON_SECRET = 'test-cron-secret-12345';

    const req = new NextRequest('http://localhost:3000/api/cron/refresh-events', {
      method: 'GET',
    });

    const res = await refreshEventsHandler(req);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.data, null);
    assert.equal(json.error?.code, 'UNAUTHORIZED');
  });

  it('rejects requests with invalid bearer token to cron refresh endpoint', async () => {
    process.env.CRON_SECRET = 'test-cron-secret-12345';

    const req = new NextRequest('http://localhost:3000/api/cron/refresh-events', {
      method: 'GET',
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    });

    const res = await refreshEventsHandler(req);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.data, null);
    assert.equal(json.error?.code, 'UNAUTHORIZED');
  });

  it('defines 10 canonical impact story slugs and 5 rolling event titles', () => {
    const expectedSlugs = [
      'wedding-surplus-became-240-community-meals',
      'restaurants-nightly-food-rescue-routine',
      'college-volunteers-built-last-mile-meal-network',
      'family-donor-helped-nearby-shelter',
      'requesters-found-meals-without-losing-dignity',
      'volunteers-coordinated-during-heavy-rain',
      'corporate-cafeteria-surplus-supported-night-workers',
      'community-kitchens-reduced-weekend-food-waste',
      'safe-packaging-improved-successful-deliveries',
      'one-neighborhoods-journey-toward-zero-food-waste',
    ];

    assert.equal(expectedSlugs.length, 10);
    assert.equal(new Set(expectedSlugs).size, 10);

    const expectedRollingEvents = [
      { title: 'Community Food Collection Drive', offset: 1 },
      { title: 'Restaurant Partner Orientation', offset: 3 },
      { title: 'Volunteer Packing and Safety Workshop', offset: 5 },
      { title: 'Zero-Waste Community Lunch', offset: 7 },
      { title: 'Neighborhood Meal Distribution Day', offset: 9 },
    ];

    assert.equal(expectedRollingEvents.length, 5);
    expectedRollingEvents.forEach(evt => {
      assert.ok(evt.offset >= 1 && evt.offset <= 10);
    });
  });
});
