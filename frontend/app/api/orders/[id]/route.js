import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * GET /api/orders/[id]
 * Get a specific order by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionToken = await getToken();

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token' },
        { status: 401 }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${sessionToken}`,
    };

    // First get all orders to find the one with matching display_id or id
    // Use Medusa v2 field expansion - expand all fields with *
    // Include metadata for zen_tier_discount
    const fields = '*,items.*,items.variant.*,shipping_address.*,billing_address.*,summary.*,payment_collections.*,shipping_methods.*,metadata';

    const response = await fetch(
      `${MEDUSA_BACKEND_URL}/store/customers/orders?limit=100&fields=${encodeURIComponent(fields)}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Get orders error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const orders = data.orders || [];

    // Find order by id or display_id
    const order = orders.find(o =>
      o.id === id ||
      o.display_id?.toString() === id ||
      o.id?.includes(id)
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
