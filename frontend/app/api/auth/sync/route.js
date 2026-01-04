import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

// Note: Zen Points tier configuration is now centralized in the backend
// The backend handles all points/tier calculations and returns computed values

/**
 * Sync customer using the Store API (no Admin key required)
 * Now includes Clerk JWT token for backend verification
 */
async function syncCustomerViaStoreAPI(clerkId, email, firstName, lastName, phone, metadata = null, sessionToken = null) {
  try {
    const bodyData = {
      clerk_id: clerkId,
      email,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      phone: phone || undefined,
    };
    
    // Include metadata if provided (for address updates, etc.)
    if (metadata) {
      bodyData.metadata = metadata;
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    };

    // Include Clerk session token for backend verification
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyData),
    });
    
    if (!response.ok) {
      try {
        const error = await response.json();
        console.error('Sync customer error:', error);
      } catch (e) {
        console.error('Sync customer error: Status', response.status);
      }
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error syncing customer:', error);
    return null;
  }
}

/**
 * Get customer by Clerk ID or email
 * Now includes Clerk JWT token for backend verification
 */
async function getCustomer(clerkId, email, sessionToken = null) {
  try {
    const params = new URLSearchParams();
    if (clerkId) params.append('clerk_id', clerkId);
    if (email) params.append('email', email);

    const headers = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    };

    // Include Clerk session token for backend verification
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/sync?${params.toString()}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.exists ? data.customer : null;
  } catch (error) {
    console.error('Error getting customer:', error);
    return null;
  }
}

/**
 * Sync Clerk user with Medusa customer
 * Creates a Medusa customer if one doesn't exist, or returns existing one
 */
export async function POST(request) {
  try {
    // Get authenticated Clerk user
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get full user details from Clerk
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const phone = clerkUser.primaryPhoneNumber?.phoneNumber || '';

    if (!email) {
      return NextResponse.json(
        { error: 'No email found for user' },
        { status: 400 }
      );
    }

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    // Get cart ID from request body (if available)
    let cartId = null;
    try {
      const body = await request.json();
      cartId = body.cartId;
    } catch (e) {
      // No body, that's okay
    }

    // Sync customer via Store API (creates if doesn't exist, updates if exists)
    const syncResult = await syncCustomerViaStoreAPI(
      clerkUser.id,
      email,
      firstName,
      lastName,
      phone,
      null, // metadata
      sessionToken
    );

    if (!syncResult || !syncResult.success) {
      // IMPORTANT: Return error if customer sync fails
      // User should not be able to proceed without a Medusa customer
      console.error('Failed to sync customer to Medusa:', syncResult);
      return NextResponse.json(
        { 
          error: 'Failed to create account in store system',
          details: 'Please try again or contact support',
        },
        { status: 500 }
      );
    }

    const medusaCustomer = syncResult.customer;
    const isNewCustomer = syncResult.action === 'created';

    // Signup bonus is now handled entirely by the backend in getInitialZenPoints()
    // The backend automatically applies 50 points when creating a new customer
    const signupBonus = isNewCustomer ? (medusaCustomer.metadata?.zen_points?.current_balance || 0) : 0;

    return NextResponse.json({
      success: true,
      customer: {
        id: medusaCustomer.id,
        email: medusaCustomer.email,
        first_name: medusaCustomer.first_name || firstName,
        last_name: medusaCustomer.last_name || lastName,
        phone: medusaCustomer.phone || phone,
        metadata: medusaCustomer.metadata || {},
        has_account: true,
        clerk_id: clerkUser.id,
      },
      isNewCustomer,
      signupBonus,
      cartId,
    });

  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync user', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get current synced customer
 */
export async function GET() {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { customer: null, isLoggedIn: false },
        { status: 200 }
      );
    }

    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json(
        { customer: null, isLoggedIn: false },
        { status: 200 }
      );
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress;

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    // Try to find existing Medusa customer
    const medusaCustomer = await getCustomer(clerkUser.id, email, sessionToken);

    if (medusaCustomer) {
      return NextResponse.json({
        customer: {
          id: medusaCustomer.id,
          email: medusaCustomer.email,
          first_name: medusaCustomer.first_name,
          last_name: medusaCustomer.last_name,
          phone: medusaCustomer.phone,
          metadata: medusaCustomer.metadata || {},
          has_account: true,
          clerk_id: clerkUser.id,
        },
        isLoggedIn: true,
      });
    }

    // Customer doesn't exist in Medusa yet - needs sync
    return NextResponse.json({
      customer: null,
      isLoggedIn: true,
      needsSync: true,
      clerkUser: {
        id: clerkUser.id,
        email,
        first_name: clerkUser.firstName || '',
        last_name: clerkUser.lastName || '',
        phone: clerkUser.primaryPhoneNumber?.phoneNumber || '',
      },
    });

  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json(
      { customer: null, isLoggedIn: false, error: error.message },
      { status: 200 }
    );
  }
}

/**
 * Update customer data (addresses, phone, etc.)
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

    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const body = await request.json();

    // Get Clerk session token for backend verification
    const sessionToken = await getToken();

    // Update customer via sync endpoint (including metadata for addresses)
    const syncResult = await syncCustomerViaStoreAPI(
      clerkUser.id,
      email,
      body.first_name || clerkUser.firstName,
      body.last_name || clerkUser.lastName,
      body.phone || clerkUser.primaryPhoneNumber?.phoneNumber,
      body.metadata || null,  // Pass metadata for address updates
      sessionToken
    );

    if (!syncResult || !syncResult.success) {
      return NextResponse.json(
        { error: 'Failed to update customer' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      customer: syncResult.customer,
    });

  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { error: 'Failed to update customer', details: error.message },
      { status: 500 }
    );
  }
}
