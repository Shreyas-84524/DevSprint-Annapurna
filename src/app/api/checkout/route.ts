import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Monetary donations are retired. Annapurna operates strictly as a zero-hunger food redistribution platform. Please donate surplus food directly.',
      code: 'MONETARY_DONATIONS_RETIRED',
    },
    { status: 410 }
  );
}
