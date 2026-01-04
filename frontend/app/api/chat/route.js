/**
 * Chat API Proxy
 * 
 * Forwards chat requests to the backend with Clerk authentication.
 * This keeps the backend URL and authentication flow secure.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';

export async function POST(request) {
  try {
    // Get Clerk session token
    const { getToken, userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const token = await getToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to get authentication token' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Forward to backend with Medusa publishable key
    const response = await fetch(`${BACKEND_URL}/store/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '',
      },
      body: JSON.stringify(body),
    });
    
    // Get response data
    const data = await response.json();
    
    // Forward status code and response
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('[Chat Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

