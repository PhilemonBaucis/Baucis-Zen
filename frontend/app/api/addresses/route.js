import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * GET /api/addresses
 * Get all addresses for the current customer
 */
export async function GET() {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', addresses: [] },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found', addresses: [] },
        { status: 404 }
      );
    }

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    };

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(
      `${MEDUSA_BACKEND_URL}/store/customers/addresses?clerk_id=${clerkUser.id}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Get addresses error:', error);
      return NextResponse.json({ addresses: [] });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      addresses: data.addresses || [],
    });

  } catch (error) {
    console.error('Get addresses error:', error);
    return NextResponse.json(
      { error: 'Failed to get addresses', addresses: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addresses
 * Create a new address
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

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    const body = await request.json();

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    };

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/addresses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clerk_id: clerkUser.id,
        address: body.address,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Create address error:', error);
      return NextResponse.json(
        { error: 'Failed to create address' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      address: data.address,
      addresses: data.addresses || [],
    });

  } catch (error) {
    console.error('Create address error:', error);
    return NextResponse.json(
      { error: 'Failed to create address' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/addresses
 * Update an existing address
 */
export async function PUT(request) {
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

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    const body = await request.json();

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    };

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/addresses`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        clerk_id: clerkUser.id,
        address: body.address,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Update address error:', error);
      return NextResponse.json(
        { error: 'Failed to update address' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      address: data.address,
      addresses: data.addresses || [],
    });

  } catch (error) {
    console.error('Update address error:', error);
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/addresses
 * Delete an address
 */
export async function DELETE(request) {
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

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    const body = await request.json();

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    };

    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/addresses`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        clerk_id: clerkUser.id,
        address_id: body.address_id,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Delete address error:', error);
      return NextResponse.json(
        { error: 'Failed to delete address' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      addresses: data.addresses || [],
    });

  } catch (error) {
    console.error('Delete address error:', error);
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}
