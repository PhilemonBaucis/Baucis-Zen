/**
 * POK Pay Payment Service for Baucis Zen
 *
 * Handles credit/debit card payments via POK (Albanian NEO Bank).
 * Supports 3DS authentication for secure card payments.
 *
 * Environment variables:
 * - POK_API_URL: Base URL (https://api.pokpay.io or https://api-staging.pokpay.io)
 * - POK_MERCHANT_ID: Merchant ID from POK
 * - POK_API_KEY: API Key for authentication
 * - POK_API_SECRET: API Secret for authentication
 */

// POK API Configuration
const getPokConfig = () => ({
  apiUrl: process.env.POK_API_URL || 'https://api-staging.pokpay.io',
  merchantId: process.env.POK_MERCHANT_ID || '',
  keyId: process.env.POK_API_KEY || '',      // keyId for auth
  keySecret: process.env.POK_API_SECRET || '', // keySecret for auth
})

// Token caching
let cachedAccessToken: string = ''
let tokenExpiresAt: number = 0

// ============================================================================
// Types
// ============================================================================

export interface PokSdkOrder {
  id: string
  amount: number
  currencyCode: string
  isCompleted: boolean
  isCanceled: boolean
  isRefunded: boolean
  transactionId?: string
  merchant: {
    id: string
    name: string
  }
  _self: {
    confirmUrl: string
    confirmDeeplink: string
  }
  supportedPaymentMethods: string[]
  createdAt: string
  expiresAt: string
}

export interface PokCardTokenizeResult {
  creditCardId: string
  last4: string
  brand: string
  expiryMonth: string
  expiryYear: string
}

export interface Pok3dsEnrollmentResult {
  status: 'PENDING_AUTHENTICATION' | 'AUTHENTICATION_SUCCESSFUL' | 'AUTHENTICATION_FAILED'
  stepUp?: {
    accessToken: string
    url: string
  }
  MD?: string // Credit debit card ID
}

export interface PokPaymentConfirmResult {
  success: boolean
  sdkOrder: PokSdkOrder
  transactionId?: string
  message: string
}

export interface PokApiResponse<T> {
  statusCode: number
  serverStatusCode: number
  data: T
  message: string
  requestId: string
  errors: string[]
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Get access token for POK API
 * Uses POST /auth/sdk/login with keyId and keySecret
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 1 minute buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken
  }

  const config = getPokConfig()

  if (!config.keyId || !config.keySecret) {
    throw new Error('POK API credentials not configured. Set POK_API_KEY and POK_API_SECRET')
  }

  console.log('[POK] Authenticating with POK API...')

  const response = await fetch(`${config.apiUrl}/auth/sdk/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: config.keyId,
      keySecret: config.keySecret,
    }),
  })

  const data = await response.json()

  if (!response.ok || data.statusCode !== 200) {
    console.error('[POK] Auth failed:', data)
    throw new Error(`POK authentication failed: ${data.message || response.status}`)
  }

  cachedAccessToken = data.data.accessToken
  // Set expiry from response or default to 1 hour
  const expiresIn = data.data.expiresIn || 3600
  tokenExpiresAt = Date.now() + expiresIn * 1000

  console.log('[POK] Successfully authenticated')
  return cachedAccessToken
}

/**
 * Make authenticated request to POK API
 */
async function pokRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: object
): Promise<PokApiResponse<T>> {
  const config = getPokConfig()
  const accessToken = await getAccessToken()

  console.log(`[POK] Request: ${method} ${config.apiUrl}${path}`)

  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok || (data.statusCode && data.statusCode !== 200)) {
    console.error(`[POK] API error ${response.status}:`, data)
    throw new Error(data.message || data.error || `POK API error: ${response.status}`)
  }

  return data as PokApiResponse<T>
}

// ============================================================================
// SDK Orders
// ============================================================================

/**
 * Create a POK SDK Order for payment
 *
 * @param amount - Total amount in euros (e.g., 10.50 for €10.50)
 * @param currency - Currency code (EUR or ALL)
 * @param merchantReference - Unique reference (cart ID)
 * @param description - Order description
 */
export async function createSdkOrder(
  amount: number,
  currency: string,
  merchantReference: string,
  description?: string
): Promise<PokSdkOrder> {
  const config = getPokConfig()

  if (!config.merchantId) {
    throw new Error('POK_MERCHANT_ID not configured')
  }

  // POK expects amount in euros (decimal), not cents
  // e.g., €10.50 should be sent as 10.50
  const amountInEuros = Math.round(amount * 100) / 100  // Round to 2 decimal places

  console.log(`[POK] Creating SDK order: ${amountInEuros} ${currency} (ref: ${merchantReference})`)

  // Correct endpoint: POST /merchants/{merchantId}/sdk-orders
  // Note: POK doesn't support separate shipping field - total amount only
  const response = await pokRequest<{ sdkOrder: PokSdkOrder }>(
    'POST',
    `/merchants/${config.merchantId}/sdk-orders`,
    {
      amount: amountInEuros,
      currencyCode: currency.toUpperCase(),
      merchantCustomReference: merchantReference,
      description: description || `Baucis Zen Order ${merchantReference}`,
      autoCapture: true,
    }
  )

  console.log(`[POK] SDK order created: ${response.data.sdkOrder.id}`)
  return response.data.sdkOrder
}

/**
 * Get SDK Order status
 */
export async function getSdkOrderStatus(orderId: string): Promise<PokSdkOrder> {
  const response = await pokRequest<{ sdkOrder: PokSdkOrder }>('GET', `/sdk-orders/${orderId}`)
  return response.data.sdkOrder
}

// ============================================================================
// Card Tokenization
// ============================================================================

/**
 * Tokenize a credit/debit card for guest payment
 * Card data is sent directly to POK - never stored on our servers
 *
 * @param cardNumber - Full card number
 * @param expiryMonth - 2-digit month (01-12)
 * @param expiryYear - 2-digit year (YY)
 * @param cvv - 3 or 4 digit CVV
 * @param holderName - Cardholder name as printed on card
 */
export async function tokenizeCard(
  cardNumber: string,
  expiryMonth: string,
  expiryYear: string,
  cvv: string,
  holderName: string
): Promise<PokCardTokenizeResult> {
  // Log only masked card info for debugging
  const last4 = cardNumber.slice(-4)
  console.log(`[POK] Tokenizing card ending in ${last4}`)

  const response = await pokRequest<{ creditCard: PokCardTokenizeResult }>('POST', '/credit-debit-cards/create-guest-card', {
    cardNumber: cardNumber.replace(/\s/g, ''),
    expiryMonth,
    expiryYear,
    cvv,
    holderName,
  })

  console.log(`[POK] Card tokenized: ${response.data.creditCard.creditCardId}`)
  return response.data.creditCard
}

// ============================================================================
// 3DS Authentication
// ============================================================================

/**
 * Check 3DS enrollment for a card
 * This initiates the 3DS authentication flow if required
 *
 * @param creditCardId - Tokenized card ID
 * @param sdkOrderId - POK SDK Order ID
 * @param amount - Amount in euros (will be converted to cents)
 * @param currency - Currency code
 */
export async function check3dsEnrollment(
  creditCardId: string,
  sdkOrderId: string,
  amount: number,
  currency: string
): Promise<Pok3dsEnrollmentResult> {
  // Convert to cents for POK API
  const amountInCents = Math.round(amount * 100)

  console.log(`[POK] Checking 3DS enrollment for order ${sdkOrderId} (${amountInCents} cents)`)

  const response = await pokRequest<{ payerAuthenticationEnrollment: Pok3dsEnrollmentResult }>(
    'POST',
    `/credit-debit-cards/${creditCardId}/check-3ds-enrollment`,
    {
      csAuthentication: {
        amount: amountInCents,
        currencyCode: currency.toUpperCase(),
      },
      sdkOrderId,
    }
  )

  const enrollment = response.data.payerAuthenticationEnrollment
  console.log(`[POK] 3DS status: ${enrollment.status}`)

  return enrollment
}

// ============================================================================
// Payment Confirmation
// ============================================================================

/**
 * Confirm a guest payment after 3DS authentication
 *
 * @param sdkOrderId - POK SDK Order ID
 * @param creditCardId - Tokenized card ID
 * @param consumerAuthInfo - 3DS authentication info from browser callback
 */
export async function confirmGuestPayment(
  sdkOrderId: string,
  creditCardId: string,
  consumerAuthInfo?: object
): Promise<PokPaymentConfirmResult> {
  console.log(`[POK] Confirming payment for order ${sdkOrderId}`)

  const body: Record<string, unknown> = {
    creditCardId,
  }

  if (consumerAuthInfo) {
    body.consumerAuthenticationInformation = consumerAuthInfo
  }

  const response = await pokRequest<{ sdkOrder: PokSdkOrder }>(
    'POST',
    `/sdk-orders/${sdkOrderId}/guest-confirm`,
    body
  )

  const sdkOrder = response.data.sdkOrder

  return {
    success: sdkOrder.isCompleted,
    sdkOrder,
    transactionId: sdkOrder.transactionId,
    message: response.message,
  }
}

// ============================================================================
// Configuration Check
// ============================================================================

/**
 * Check if POK is properly configured
 */
export function isPokConfigured(): boolean {
  const config = getPokConfig()
  return !!(config.apiUrl && config.merchantId && config.keyId && config.keySecret)
}

/**
 * Check if using staging environment
 */
export function isPokStaging(): boolean {
  const config = getPokConfig()
  return config.apiUrl.includes('staging')
}
