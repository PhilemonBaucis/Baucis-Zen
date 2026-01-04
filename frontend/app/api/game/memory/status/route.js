import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * GET /api/game/memory/status
 * 
 * Proxies to backend to get memory game status for authenticated user.
 */
export async function GET() {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', can_play: false },
        { status: 401 }
      );
    }

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/game/memory/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Game status error:', error);
    return NextResponse.json(
      { error: 'Failed to get game status', can_play: false },
      { status: 500 }
    );
  }
}

