import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;

/**
 * GET /api/orders/[id]/invoice
 *
 * Proxy request to backend invoice endpoint.
 * Backend is the single source of truth for invoice generation.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = await getToken();
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token' }, { status: 401 });
    }

    // Call backend invoice endpoint
    const response = await fetch(
      `${MEDUSA_BACKEND_URL}/store/orders/${id}/invoice`,
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate invoice' }));
      return NextResponse.json(error, { status: response.status });
    }

    // Get the PDF buffer from backend
    const pdfBuffer = await response.arrayBuffer();

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': response.headers.get('Content-Disposition') || `attachment; filename="invoice-${id}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Get invoice error:', error.message);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
