import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * GET /api/orders
 * Get order history for the current customer
 *
 * Query params:
 *   - limit: number (default 10)
 *   - offset: number (default 0)
 */
export async function GET(request) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', orders: [], count: 0 },
        { status: 401 }
      );
    }

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token', orders: [], count: 0 },
        { status: 401 }
      );
    }

    // Get pagination params from URL
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    const offset = searchParams.get('offset') || '0';

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${sessionToken}`,
    };

    // Include all necessary fields for proper display including metadata for zen_tier_discount
    const fields = '*,summary.*,items.*,shipping_methods.*,metadata';

    const response = await fetch(
      `${MEDUSA_BACKEND_URL}/store/customers/orders?limit=${limit}&offset=${offset}&fields=${encodeURIComponent(fields)}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Get orders error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', orders: [], count: 0 },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      orders: data.orders || [],
      count: data.count || 0,
      limit: data.limit || parseInt(limit),
      offset: data.offset || parseInt(offset),
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', orders: [], count: 0 },
      { status: 500 }
    );
  }
}
