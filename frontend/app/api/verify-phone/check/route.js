import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * POST /api/verify-phone/check
 * 
 * Proxy to backend phone verification - checks SMS code
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, code, cart_id } = body;

    if (!phone) {
      return NextResponse.json(
        { verified: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { verified: false, error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Forward request to Medusa backend
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/verify-phone/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ phone, code, cart_id }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { verified: false, error: data.error || 'Verification failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Verify Phone Check] Error:', error);
    return NextResponse.json(
      { verified: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}

