import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * Save cart ID to customer metadata for recovery on next login
 * 
 * Now properly passes Clerk JWT token for backend authentication
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

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { cartId } = body;

    // Allow cartId to be null to clear stale cart reference

    const email = clerkUser.primaryEmailAddress?.emailAddress;

    // Get Clerk session token for backend authentication
    const sessionToken = await getToken();

    if (!sessionToken) {
      console.error('[Cart Save] No session token available');
      return NextResponse.json(
        { error: 'Authentication token not available' },
        { status: 401 }
      );
    }

    // Build headers with JWT authentication
    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${sessionToken}`,
    };

    // Update customer metadata with active cart ID
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clerk_id: clerkUser.id,
        email,
        metadata: {
          active_cart_id: cartId,
          cart_saved_at: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[Cart Save] Failed to save cart:', error);
      return NextResponse.json(
        { error: 'Failed to save cart', details: error.error },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Cart Save] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save cart', details: error.message },
      { status: 500 }
    );
  }
}
