import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * Delete customer via backend endpoint (using Clerk JWT for authentication)
 */
async function deleteCustomerViaBackend(clerkSessionToken, reason, reasonLabel) {
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${clerkSessionToken}`,
      },
      body: JSON.stringify({
        reason,
        reasonLabel,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Error deleting customer via backend:', error);
      return { success: false, error: error.error || 'Unknown error' };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error deleting customer via backend:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete account endpoint
 * - Calls backend to soft-delete Medusa customer (uses Clerk JWT for auth)
 * - Deletes the Clerk user
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

    const email = clerkUser.primaryEmailAddress?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: 'No email found for user' },
        { status: 400 }
      );
    }

    // Get deletion reason from request body
    const body = await request.json();
    const { reason, reasonLabel } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Deletion reason is required' },
        { status: 400 }
      );
    }

    // Get Clerk session token for backend authentication
    const sessionToken = await getToken();

    // Step 1: Delete Medusa customer via backend endpoint
    if (sessionToken) {
      const result = await deleteCustomerViaBackend(sessionToken, reason, reasonLabel);

      if (!result.success) {
        console.warn('Failed to delete Medusa customer via backend:', result.error);
        // Continue with Clerk deletion even if Medusa fails
      } else {
        console.log(`[Account Deletion] Medusa customer deleted. Reason: ${reasonLabel}`);
      }
    } else {
      console.warn('[Account Deletion] No session token available, skipping Medusa deletion');
    }

    // Step 2: Delete Clerk user
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
      console.log(`[Account Deletion] Clerk user ${userId} deleted`);
    } catch (clerkError) {
      console.error('Error deleting Clerk user:', clerkError);
      return NextResponse.json(
        { error: 'Failed to delete account from authentication provider' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account', details: error.message },
      { status: 500 }
    );
  }
}
