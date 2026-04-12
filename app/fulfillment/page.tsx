import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Fulfillment | Invictus MC' };

import FulfillmentTracker from "@/components/fulfillment/FulfillmentTracker";

export default function FulfillmentPage() {
  return <FulfillmentTracker />;
}
