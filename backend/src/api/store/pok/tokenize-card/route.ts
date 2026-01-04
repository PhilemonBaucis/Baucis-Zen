import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { tokenizeCard, isPokConfigured } from "../../../../lib/pok-payment"
import { applyRateLimit, getCartLimiter } from "../../../../lib/rate-limiter"

interface TokenizeCardBody {
  card_number: string
  expiry_month: string
  expiry_year: string
  cvv: string
  holder_name: string
}

/**
 * POST /store/pok/tokenize-card
 *
 * Tokenizes a credit/debit card for POK payment.
 * Card data is sent directly to POK - never stored on our servers.
 *
 * SECURITY: This endpoint only forwards card data to POK.
 * We never log, store, or process raw card numbers.
 *
 * Rate limited: 60 requests per minute (cart operations)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  // Check POK configuration
  if (!isPokConfigured()) {
    return res.status(503).json({
      success: false,
      error: "POK payments not configured",
    })
  }

  const body = req.body as TokenizeCardBody

  // Validate required fields (without logging card data)
  if (!body.card_number || !body.expiry_month || !body.expiry_year || !body.cvv || !body.holder_name) {
    return res.status(400).json({
      success: false,
      error: "Missing required card fields",
      required: ["card_number", "expiry_month", "expiry_year", "cvv", "holder_name"],
    })
  }

  // Basic validation
  const cardNumber = body.card_number.replace(/\s/g, '')
  if (cardNumber.length < 13 || cardNumber.length > 19) {
    return res.status(400).json({
      success: false,
      error: "Invalid card number length",
    })
  }

  if (body.cvv.length < 3 || body.cvv.length > 4) {
    return res.status(400).json({
      success: false,
      error: "Invalid CVV length",
    })
  }

  try {
    // Forward to POK for tokenization
    const result = await tokenizeCard(
      cardNumber,
      body.expiry_month.padStart(2, '0'),
      body.expiry_year.length === 4 ? body.expiry_year.slice(-2) : body.expiry_year,
      body.cvv,
      body.holder_name.trim()
    )

    return res.status(200).json({
      success: true,
      credit_card_id: result.creditCardId,
      last4: result.last4 || cardNumber.slice(-4),
      brand: result.brand,
    })

  } catch (error: any) {
    // Log error without card details
    console.error("[POK Tokenize] Error:", error.message, error.stack)

    // Return user-friendly error with more details for debugging
    const isValidationError = error.message?.includes('invalid') || error.message?.includes('declined')

    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      error: isValidationError ? "Card validation failed" : "Failed to process card",
      message: error.message || "Please try again or use a different card",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}
