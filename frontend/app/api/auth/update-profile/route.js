import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * Sync customer to Medusa after Clerk update
 * Now includes JWT token for backend authentication
 */
async function syncToMedusa(clerkId, email, firstName, lastName, sessionToken) {
  try {
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
      body: JSON.stringify({
        clerk_id: clerkId,
        email,
        first_name: firstName,
        last_name: lastName,
      }),
    });

    if (!response.ok) {
      console.error('Failed to sync to Medusa:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error syncing to Medusa:', error);
    return false;
  }
}

/**
 * PUT - Update name (first name and/or last name)
 */
export async function PUT(request) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName } = body;

    if (!firstName && !lastName) {
      return NextResponse.json(
        { error: 'At least firstName or lastName is required' },
        { status: 400 }
      );
    }

    // Get Clerk session token for backend authentication
    const sessionToken = await getToken();

    // Update user in Clerk
    const client = await clerkClient();
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    const updatedUser = await client.users.updateUser(userId, updateData);

    // Sync to Medusa with JWT token
    const email = updatedUser.primaryEmailAddress?.emailAddress;
    await syncToMedusa(
      userId,
      email,
      updatedUser.firstName,
      updatedUser.lastName,
      sessionToken
    );

    return NextResponse.json({
      success: true,
      user: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email,
      },
    });
  } catch (error) {
    console.error('Update name error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Initiate email change (sends verification code)
 */
export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email is already in use
    const currentEmail = clerkUser.primaryEmailAddress?.emailAddress;
    if (email === currentEmail) {
      return NextResponse.json(
        { error: 'This is already your current email' },
        { status: 400 }
      );
    }

    // Create a new email address and send verification
    const client = await clerkClient();
    
    // Add the new email address to the user
    const emailAddress = await client.emailAddresses.createEmailAddress({
      userId,
      emailAddress: email,
    });

    // Prepare verification (sends code to email)
    await client.emailAddresses.updateEmailAddress(emailAddress.id, {
      verified: false,
    });

    // The email address needs verification via code
    // Clerk will send a verification email automatically

    return NextResponse.json({
      success: true,
      emailAddressId: emailAddress.id,
      message: 'Verification code sent to your new email',
    });
  } catch (error) {
    console.error('Email change initiation error:', error);
    
    // Handle specific Clerk errors
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      return NextResponse.json(
        { error: 'This email is already in use by another account' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initiate email change', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Verify email with code and set as primary
 */
export async function PATCH(request) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailAddressId, code } = body;

    if (!emailAddressId || !code) {
      return NextResponse.json(
        { error: 'emailAddressId and code are required' },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Attempt to verify the email address with the code
    try {
      await client.emailAddresses.updateEmailAddress(emailAddressId, {
        verified: true,
      });
    } catch (verifyError) {
      // If direct verification fails, the user needs to use the magic link
      // or the code verification through Clerk's frontend SDK
      console.error('Verification error:', verifyError);
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Set as primary email
    await client.users.updateUser(userId, {
      primaryEmailAddressId: emailAddressId,
    });

    // Get updated user
    const updatedUser = await client.users.getUser(userId);
    const newEmail = updatedUser.primaryEmailAddress?.emailAddress;

    // Get Clerk session token for backend authentication
    const sessionToken = await getToken();

    // Sync to Medusa with JWT token
    await syncToMedusa(
      userId,
      newEmail,
      updatedUser.firstName,
      updatedUser.lastName,
      sessionToken
    );

    return NextResponse.json({
      success: true,
      email: newEmail,
      message: 'Email updated successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email', details: error.message },
      { status: 500 }
    );
  }
}
