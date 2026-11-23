import { handlePaystackWebhook } from '@/lib/billing/webhookHandler';
export async function POST(req: Request) {
  return handlePaystackWebhook(req, 'test');
}
