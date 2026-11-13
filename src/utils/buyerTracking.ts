import type { Order, ShipmentEvent } from '../types/order';

const publicMilestoneLabels: Record<string, string> = {
  order_created: 'Order placed',
  payment_confirmed: 'Payment confirmed',
  awaiting_collection: 'Preparing shipment',
  shipped: 'Preparing shipment',
  collected_from_seller: 'On the way',
  in_transit: 'On the way',
  arrived_at_pickup: 'At pickup point',
  collected_by_buyer: 'Collected',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const buyerMilestones = (events: ShipmentEvent[]): Array<{ label: string; createdAt: string }> => {
  const milestones = new Map<string, string>();
  for (const event of events) {
    const label = publicMilestoneLabels[event.stage];
    if (label) milestones.set(label, event.createdAt);
  }
  return [...milestones].map(([label, createdAt]) => ({ label, createdAt }));
};

export const buyerTrackingStatus = (order: Order): string => {
  if (order.status === 'cancelled') return 'Cancelled';
  if (order.status === 'delivered') return 'Completed';
  if (order.status === 'pending') return order.paymentStatus === 'paid' ? 'Payment confirmed' : order.paymentStatus === 'partial' ? 'Delivery fee paid' : 'Awaiting payment';
  const parcels = order.fulfillments.filter(fulfillment => fulfillment.status !== 'cancelled');
  const stages = parcels.map(fulfillment => new Set(fulfillment.events.map(event => event.stage)));
  const allAtPickup = stages.length > 0 && stages.every(events => events.has('arrived_at_pickup') || events.has('collected_by_buyer') || events.has('delivered'));
  if (order.deliveryMethod === 'doorstep' && order.homeDelivery?.status === 'rider_delivered') return 'Delivery reported';
  if (order.deliveryMethod === 'doorstep' && order.homeDelivery?.status === 'collected_from_pickup') return 'Out for delivery';
  if (allAtPickup && order.deliveryMethod === 'pickup_point') return 'Ready for collection';
  if (allAtPickup && order.deliveryMethod === 'doorstep') return 'At pickup point';
  if (stages.some(events => events.has('in_transit'))) return 'In transit';
  if (stages.some(events => events.has('collected_from_seller'))) return 'Collected for delivery';
  if (stages.some(events => events.has('awaiting_collection') || events.has('shipped'))) return 'Preparing shipment';
  return order.status === 'shipped' ? 'Shipped' : 'Seller preparing order';
};
