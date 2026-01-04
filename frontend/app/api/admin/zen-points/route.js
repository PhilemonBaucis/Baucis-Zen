import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const DEV_SECRET = process.env.DEV_SECRET;

/**
 * DEV/ADMIN: API endpoint to manually set Zen Points for testing
 * Allows testing different tier levels without making real purchases
 * 
 * Requires DEV_SECRET env var to be set on both frontend and backend
 */

export async function POST(request) {
  // Check if DEV_SECRET is configured
  if (!DEV_SECRET) {
    return NextResponse.json(
      { error: 'DEV_SECRET not configured. Add it to your .env.local' },
      { status: 403 }
    );
  }

  try {
    // Get authenticated Clerk user
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { points } = body;

    if (typeof points !== 'number' || points < 0) {
      return NextResponse.json(
        { error: 'Invalid points value. Must be a non-negative number.' },
        { status: 400 }
      );
    }

    // Get session token
    const sessionToken = await getToken();

    // Call dedicated dev endpoint on backend with secret
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/dev-zen-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` }),
      },
      body: JSON.stringify({
        clerk_id: clerkUser.id,
        points,
        dev_secret: DEV_SECRET,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to update zen points:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to update zen points', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message,
      points: data.points,
      tier: data.tier,
      discount: data.discount,
    });

  } catch (error) {
    console.error('Admin zen-points error:', error);
    return NextResponse.json(
      { error: 'Failed to set zen points', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Return current zen points info (dev only)
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ zenPoints: null });
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const sessionToken = await getToken();

    // Get customer from Medusa
    const params = new URLSearchParams();
    params.append('clerk_id', clerkUser.id);
    if (email) params.append('email', email);

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/sync?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` }),
      },
    });

    if (!response.ok) {
      return NextResponse.json({ zenPoints: null });
    }

    const data = await response.json();
    const zenPoints = data.customer?.metadata?.zen_points || null;

    return NextResponse.json({
      zenPoints,
      tiers: {
        seed: { min: 0, discount: 0 },
        sprout: { min: 100, discount: 5 },
        blossom: { min: 250, discount: 10 },
        lotus: { min: 500, discount: 15 },
      },
    });

  } catch (error) {
    console.error('Get zen points error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

