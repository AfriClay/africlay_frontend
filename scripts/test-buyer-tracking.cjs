const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = relativePath => readFileSync(path.join(root, relativePath), 'utf8');
const trackingModule = {};
vm.runInNewContext(ts.transpileModule(source('src/utils/buyerTracking.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: trackingModule });
const { buyerMilestones, buyerTrackingStatus } = trackingModule;

const event = (stage, minute) => ({ id: `${stage}-${minute}`, stage, createdAt: `2026-11-13T10:${minute}:00Z`, note: 'private note' });
const order = (events, status = 'shipped', deliveryMethod = 'pickup_point') => ({
  status, paymentStatus: 'paid', deliveryMethod,
  fulfillments: [{ status, events }],
});

test('tracking labels come only from recorded milestones and omit notes', () => {
  const milestones = buyerMilestones([event('order_created', '00'), event('rider_assigned', '01'), event('collected_from_seller', '02'), event('in_transit', '03')]);
  assert.deepEqual(Array.from(milestones, item => item.label), ['Order placed', 'On the way']);
  assert.equal(milestones[1].createdAt, '2026-11-13T10:03:00Z');
  assert.ok(milestones.every(item => !('note' in item)));
  assert.equal(buyerTrackingStatus(order([event('in_transit', '03')])), 'In transit');
  assert.equal(buyerTrackingStatus(order([event('order_created', '00')])), 'Shipped');
});

test('collection is ready only after every active parcel reaches pickup', () => {
  const pending = order([event('arrived_at_pickup', '10')]);
  pending.fulfillments.push({ status: 'shipped', events: [event('in_transit', '12')] });
  assert.equal(buyerTrackingStatus(pending), 'In transit');
  pending.fulfillments[1].events = [event('arrived_at_pickup', '15')];
  assert.equal(buyerTrackingStatus(pending), 'Ready for collection');
  pending.deliveryMethod = 'doorstep';
  assert.equal(buyerTrackingStatus(pending), 'At pickup point');
  pending.homeDelivery = { status: 'collected_from_pickup' };
  assert.equal(buyerTrackingStatus(pending), 'Out for delivery');
});

test('buyer tracking UI never renders raw operational notes or courier references', () => {
  const details = source('src/screens/profile/OrderDetails.tsx');
  assert.match(details, /buyerMilestones\(fulfillment\.events\)/);
  assert.match(details, /Refresh tracking/);
  assert.doesNotMatch(details, /event\.note|courierName|trackingNumber/);
  assert.match(source('src/components/domain/OrderCard.tsx'), /Track order/);
});
