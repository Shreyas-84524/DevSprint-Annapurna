import { handleDeliveryTransition } from '@/server/delivery-http';
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return handleDeliveryTransition(req, context, 'start_dropoff');
}
