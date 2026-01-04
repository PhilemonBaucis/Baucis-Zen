/**
 * Chat Context Builder
 * 
 * Builds the system prompt for Gemini AI with:
 * - Legal documentation (loaded from legal-content.ts)
 * - Customer-specific data (name, email, tier, zen points)
 * - Order history from Medusa
 */

import { getLegalContext, getLegalLastUpdated } from "./legal-content"

// Language display names for instructions
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  it: 'Italian',
  es: 'Spanish',
  tr: 'Turkish',
  el: 'Greek',
  sq: 'Albanian',
}

export interface CustomerContext {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  zenPoints?: {
    current_balance: number
    tier: string
    discount_percent: number
    lifetime_points: number
  }
  createdAt?: string
}

export interface OrderContext {
  id: string
  displayId: number
  status: string
  total: number
  currency: string
  itemCount: number
  createdAt: string
}

/**
 * Build the system prompt for Gemini AI
 */
export function buildSystemPrompt(
  locale: string,
  customer: CustomerContext | null,
  orders: OrderContext[]
): string {
  const languageName = LANGUAGE_NAMES[locale] || 'English'
  const legalContext = getLegalContext()
  const lastUpdated = getLegalLastUpdated()
  
  let prompt = `You are "Baucis", the friendly and helpful customer support assistant for Baucis Zen, a premium wellness and matcha e-commerce store.

IMPORTANT INSTRUCTIONS:
1. Respond ONLY in ${languageName} (locale: ${locale}). If the user writes in a different language, still respond in ${languageName}.
2. Be warm, helpful, and professional - embody the zen wellness brand
3. Keep responses concise but complete (aim for 2-4 sentences unless more detail is needed)
4. If you don't know something specific about an order or product, suggest contacting support@baucis-zen.com
5. Never make up order information - only reference what's provided in the context below
6. For product recommendations, suggest visiting the shop page at /products
7. Use the customer's first name when appropriate to personalize the interaction
8. For complex issues (damaged items, payment problems), guide them to email support

${legalContext}
`

  // Add customer context if available
  if (customer) {
    prompt += `
CURRENT CUSTOMER INFORMATION:
• Name: ${customer.firstName || ''} ${customer.lastName || ''}
• Email: ${customer.email}
${customer.phone ? `• Phone: ${customer.phone}` : ''}
${customer.zenPoints ? `
• Zen Points: ${customer.zenPoints.current_balance} points
• Tier: ${customer.zenPoints.tier} (${customer.zenPoints.discount_percent}% discount)
• Lifetime Points: ${customer.zenPoints.lifetime_points}
` : ''}
${customer.createdAt ? `• Member since: ${new Date(customer.createdAt).toLocaleDateString()}` : ''}
`
  }

  // Add order history if available
  if (orders && orders.length > 0) {
    prompt += `
ORDER HISTORY (${orders.length} total orders):
`
    orders.slice(0, 10).forEach((order, index) => {
      prompt += `${index + 1}. Order #${order.displayId}
   • Status: ${order.status}
   • Total: €${(order.total / 100).toFixed(2)}
   • Items: ${order.itemCount}
   • Date: ${new Date(order.createdAt).toLocaleDateString()}
`
    })
    
    if (orders.length > 10) {
      prompt += `\n... and ${orders.length - 10} more orders (showing most recent 10)\n`
    }
  } else {
    prompt += `
ORDER HISTORY: No orders yet - this is a new customer!
`
  }

  prompt += `
---
Remember: Be helpful, stay on brand (zen, wellness, mindfulness), and always respond in ${languageName}.
Policy data last updated: ${lastUpdated}`

  return prompt
}

/**
 * Detect language from user message (fallback if locale not provided)
 */
export function detectLanguageInstruction(message: string, locale: string): string {
  const languageName = LANGUAGE_NAMES[locale] || 'English'
  return `Respond in ${languageName}.`
}
