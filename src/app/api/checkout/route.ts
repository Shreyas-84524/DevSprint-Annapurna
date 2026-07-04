import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, title } = await req.json();
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Mock Razorpay order checkout redirect URL
    const paymentId = 'pay_' + Math.random().toString(36).substring(2, 11);
    const mockSessionUrl = `${origin}/donate?success=true&amount=${amount}&title=${encodeURIComponent(title)}&payment_id=${paymentId}`;

    return NextResponse.json({ url: mockSessionUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
