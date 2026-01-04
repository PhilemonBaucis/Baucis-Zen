import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * POST /api/verify-phone/send
 * 
 * Proxy to backend phone verification - sends SMS code
 */
export async function POST(request) {
  try {
    // Check if backend URL is configured
    if (!MEDUSA_BACKEND_URL) {
      console.error('[Verify Phone Send] MEDUSA_BACKEND_URL not configured');
      return NextResponse.json(
        { success: false, error: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('[Verify Phone Send] Sending request to:', `${MEDUSA_BACKEND_URL}/store/verify-phone/send`);

    // Forward request to Medusa backend
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/verify-phone/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY || '',
      },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();
    
    console.log('[Verify Phone Send] Backend response:', response.status, data);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to send verification code' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Verify Phone Send] Error:', error.message || error);
    return NextResponse.json(
      { success: false, error: `Server error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

