/**
 * Log Sanitization Utilities
 * Prevents PII from appearing in production logs
 */

/**
 * Sanitize email for logging
 * "john.doe@example.com" -> "j***@example.com"
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return "[no-email]"
  
  const [local, domain] = email.split("@")
  if (!domain) return "[invalid-email]"
  
  const sanitizedLocal = local.length > 0 
    ? `${local[0]}***` 
    : "***"
  
  return `${sanitizedLocal}@${domain}`
}

/**
 * Sanitize Clerk ID for logging
 * "user_2abc123xyz789" -> "user_2ab..."
 */
export function sanitizeClerkId(clerkId: string | null | undefined): string {
  if (!clerkId) return "[no-clerk-id]"
  return clerkId.length > 10 ? `${clerkId.substring(0, 10)}...` : clerkId
}

/**
 * Sanitize Cart ID for logging
 * "cart_01JABCDEF123456789" -> "cart_01J..."
 */
export function sanitizeCartId(cartId: string | null | undefined): string {
  if (!cartId) return "[no-cart-id]"
  return cartId.length > 11 ? `${cartId.substring(0, 11)}...` : cartId
}

/**
 * Sanitize Customer ID for logging
 * "cus_01JABCDEF123456789" -> "cus_01JA..."
 */
export function sanitizeCustomerId(customerId: string | null | undefined): string {
  if (!customerId) return "[no-customer-id]"
  return customerId.length > 12 ? `${customerId.substring(0, 12)}...` : customerId
}

/**
 * Get a safe log prefix with sanitized identifiers
 */
export function safeLogContext(context: {
  email?: string | null
  clerkId?: string | null
  cartId?: string | null
  customerId?: string | null
}): string {
  const parts: string[] = []
  
  if (context.email) parts.push(`email=${sanitizeEmail(context.email)}`)
  if (context.clerkId) parts.push(`clerk=${sanitizeClerkId(context.clerkId)}`)
  if (context.cartId) parts.push(`cart=${sanitizeCartId(context.cartId)}`)
  if (context.customerId) parts.push(`customer=${sanitizeCustomerId(context.customerId)}`)
  
  return parts.length > 0 ? `[${parts.join(", ")}]` : ""
}

