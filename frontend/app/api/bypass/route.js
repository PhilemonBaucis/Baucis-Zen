import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  const expectedKey = process.env.MAINTENANCE_BYPASS_KEY

  // Check if bypass key is configured
  if (!expectedKey) {
    return NextResponse.json(
      { error: 'Maintenance bypass not configured' }, 
      { status: 500 }
    )
  }

  // Validate the provided key
  if (key === expectedKey) {
    // Create response that redirects to home
    const response = NextResponse.redirect(new URL('/', request.url))
    
    // Set bypass cookie (valid for 7 days)
    response.cookies.set('bypass_maintenance', key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    
    return response
  }

  // Invalid key
  return NextResponse.json(
    { error: 'Invalid bypass key' }, 
    { status: 401 }
  )
}

// Also support clearing the bypass cookie
export async function DELETE(request) {
  const response = NextResponse.json({ success: true, message: 'Bypass cookie cleared' })
  
  response.cookies.set('bypass_maintenance', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  })
  
  return response
}

