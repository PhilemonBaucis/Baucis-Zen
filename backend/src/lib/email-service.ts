/**
 * Gmail API Email Service for Baucis Zen
 *
 * Uses Google Service Account with domain-wide delegation for sending emails.
 * Requires Google Workspace and a service account with Gmail API access.
 *
 * Environment variables (Option 1 - Individual vars, recommended):
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email (xxx@project.iam.gserviceaccount.com)
 * - GOOGLE_PRIVATE_KEY: RSA private key (with \n for newlines)
 * - GOOGLE_CLIENT_ID: Client ID from service account
 * - GMAIL_USER_EMAIL: The real user account to impersonate (must be actual Workspace user)
 * - GMAIL_FROM_EMAIL: (Optional) Alias to show in From header (must be configured as "Send As" for the user)
 *
 * Environment variables (Option 2 - Full JSON):
 * - GMAIL_SERVICE_ACCOUNT_KEY: JSON string of service account credentials
 * - GMAIL_USER_EMAIL: The real user account to impersonate
 * - GMAIL_FROM_EMAIL: (Optional) Alias to show in From header
 */

const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Cache the access token
let cachedAccessToken: string = ''
let tokenExpiresAt: number = 0

interface ServiceAccountKey {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
}

/**
 * Create a JWT for service account authentication
 */
function createJWT(serviceAccount: ServiceAccountKey, userEmail: string): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    sub: userEmail, // The user to impersonate
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600, // 1 hour
  }

  // Base64url encode
  const base64url = (obj: object) => {
    const json = JSON.stringify(obj)
    const base64 = Buffer.from(json).toString('base64')
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const headerEncoded = base64url(header)
  const payloadEncoded = base64url(payload)
  const signatureInput = `${headerEncoded}.${payloadEncoded}`

  // Sign with private key
  const crypto = require('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(serviceAccount.private_key, 'base64')
  const signatureEncoded = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return `${signatureInput}.${signatureEncoded}`
}

/**
 * Build service account object from environment variables
 */
function getServiceAccountFromEnv(): ServiceAccountKey | null {
  // Option 1: Individual environment variables (preferred)
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID

  if (clientEmail && privateKey) {
    // Handle escaped newlines in private key (same robust logic as sheets-sync.ts)
    // Step 1: Handle double-escaped (\\n -> \n) for JSON-stringified keys
    let formattedKey = privateKey.replace(/\\\\n/g, '\n')
    // Step 2: Handle single-escaped (\n -> actual newline)
    formattedKey = formattedKey.replace(/\\n/g, '\n')

    return {
      type: 'service_account',
      project_id: '',
      private_key_id: '',
      private_key: formattedKey,
      client_email: clientEmail,
      client_id: clientId || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: GOOGLE_TOKEN_URL,
    }
  }

  // Option 2: Full JSON string
  const serviceAccountKeyStr = process.env.GMAIL_SERVICE_ACCOUNT_KEY
  if (serviceAccountKeyStr) {
    try {
      return JSON.parse(serviceAccountKeyStr)
    } catch {
      console.error('[Email] Invalid GMAIL_SERVICE_ACCOUNT_KEY JSON')
    }
  }

  return null
}

/**
 * Get access token using service account
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken
  }

  const userEmail = process.env.GMAIL_USER_EMAIL
  const serviceAccount = getServiceAccountFromEnv()

  if (!serviceAccount || !userEmail) {
    throw new Error('Gmail service account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY + GMAIL_USER_EMAIL')
  }

  console.log(`[Email] Using service account: ${serviceAccount.client_email}, sending as: ${userEmail}`)

  // Create JWT assertion
  const jwt = createJWT(serviceAccount, userEmail)

  // Exchange JWT for access token
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  cachedAccessToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in * 1000)

  return cachedAccessToken
}

interface EmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

/**
 * Send email via Gmail API
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
  attachments?: EmailAttachment[]
): Promise<boolean> {
  try {
    // Use GMAIL_FROM_EMAIL for the From header (alias), fallback to GMAIL_USER_EMAIL (auth account)
    const fromEmail = process.env.GMAIL_FROM_EMAIL || process.env.GMAIL_USER_EMAIL || 'logistics@bauciszen.com'
    const accessToken = await getAccessToken()

    let rawMessage: string

    if (attachments && attachments.length > 0) {
      // Build multipart/mixed message with attachments
      const boundary = 'boundary_mixed_' + Date.now()
      const altBoundary = 'boundary_alt_' + Date.now()

      const messageParts = [
        `From: Baucis Zen <${fromEmail}>`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        '',
        `--${altBoundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        textContent || subject,
        `--${altBoundary}`,
        'Content-Type: text/html; charset=UTF-8',
        '',
        htmlContent,
        `--${altBoundary}--`,
      ]

      // Add attachments
      for (const attachment of attachments) {
        const base64Content = attachment.content.toString('base64')
        messageParts.push(
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          '',
          base64Content
        )
      }

      messageParts.push(`--${boundary}--`)
      rawMessage = messageParts.join('\r\n')
    } else {
      // Build simple multipart/alternative message without attachments
      const messageParts = [
        `From: Baucis Zen <${fromEmail}>`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="boundary123"',
        '',
        '--boundary123',
        'Content-Type: text/plain; charset=UTF-8',
        '',
        textContent || subject,
        '--boundary123',
        'Content-Type: text/html; charset=UTF-8',
        '',
        htmlContent,
        '--boundary123--',
      ]
      rawMessage = messageParts.join('\r\n')
    }

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await fetch(GMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] Gmail API error:', error)
      return false
    }

    console.log(`[Email] Successfully sent email to ${to}: ${subject}${attachments ? ` with ${attachments.length} attachment(s)` : ''}`)
    return true
  } catch (error) {
    console.error('[Email] Failed to send email:', error)
    return false
  }
}

/**
 * Check if Gmail API is configured
 */
export function isEmailConfigured(): boolean {
  const hasUserEmail = !!process.env.GMAIL_USER_EMAIL

  // Option 1: Individual env vars
  const hasIndividualVars = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  )

  // Option 2: Full JSON
  const hasJsonKey = !!process.env.GMAIL_SERVICE_ACCOUNT_KEY

  return hasUserEmail && (hasIndividualVars || hasJsonKey)
}
