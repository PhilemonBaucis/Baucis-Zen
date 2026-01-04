import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * POST /api/game/memory/complete
 * 
 * Proxies to backend to complete a memory game and claim Zen Points.
 * Validates signature, time taken, and awards points.
 */
export async function POST(request) {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/game/memory/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Game complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete game' },
      { status: 500 }
    );
  }
}

