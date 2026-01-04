/**
 * Phone Verification - Check Code
 * 
 * Verifies the SMS code sent via Twilio Verify API
 * Stores verification status in cart metadata for checkout
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Twilio client (lazy initialization)
let twilioClient: any = null

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured")
    }
    
    const twilio = require("twilio")
    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

/**
 * Normalize phone number (remove spaces)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim()
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { phone, code, cart_id } = req.body as { 
      phone?: string
      code?: string
      cart_id?: string 
    }
    
    // Validate inputs
    if (!phone) {
      return res.status(400).json({ 
        verified: false, 
        error: "Phone number is required" 
      })
    }
    
    if (!code || code.length < 4) {
      return res.status(400).json({ 
        verified: false, 
        error: "Verification code is required" 
      })
    }
    
    const normalizedPhone = normalizePhone(phone)
    const normalizedCode = code.replace(/\D/g, "") // Remove non-digits
    
    // Check if Twilio is configured
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
    if (!serviceSid) {
      console.error("[Phone Verify] TWILIO_VERIFY_SERVICE_SID not configured")
      
      // In development, allow bypass with code "123456"
      if (process.env.NODE_ENV !== "production") {
        if (normalizedCode === "123456") {
          console.warn("[Phone Verify] ⚠️ Development mode - bypassing verification")
          
          // Store verification in cart if provided
          if (cart_id) {
            await storeVerificationInCart(req, cart_id, normalizedPhone)
          }
          
          return res.json({ 
            verified: true, 
            message: "Development mode - verification bypassed",
            dev_bypass: true
          })
        } else {
          return res.status(400).json({ 
            verified: false, 
            error: "Invalid code (dev mode: use 123456)" 
          })
        }
      }
      
      return res.status(503).json({ 
        verified: false, 
        error: "Phone verification service not available" 
      })
    }
    
    // Verify code with Twilio
    const client = getTwilioClient()
    
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: normalizedPhone,
        code: normalizedCode,
      })
    
    console.log(`[Phone Verify] Check for ${normalizedPhone.slice(0, -4)}****, status: ${verificationCheck.status}`)
    
    if (verificationCheck.status === "approved") {
      // Store verification in cart if provided
      if (cart_id) {
        await storeVerificationInCart(req, cart_id, normalizedPhone)
      }
      
      return res.json({ 
        verified: true,
        status: verificationCheck.status,
        message: "Phone number verified successfully"
      })
    } else {
      return res.status(400).json({ 
        verified: false, 
        status: verificationCheck.status,
        error: "Invalid verification code" 
      })
    }
    
  } catch (error: any) {
    console.error("[Phone Verify] Error verifying code:", error.message)
    
    // Handle specific Twilio errors
    if (error.code === 20404) {
      return res.status(400).json({ 
        verified: false, 
        error: "Verification code expired or not found. Please request a new code." 
      })
    }
    
    if (error.code === 60202) {
      return res.status(429).json({ 
        verified: false, 
        error: "Too many failed attempts. Please request a new code." 
      })
    }
    
    return res.status(500).json({ 
      verified: false, 
      error: "Verification failed. Please try again." 
    })
  }
}

/**
 * Store phone verification status in cart metadata
 */
async function storeVerificationInCart(
  req: MedusaRequest, 
  cartId: string, 
  phone: string
): Promise<void> {
  try {
    const cartService = req.scope.resolve(Modules.CART)
    
    // Get current cart
    const cart = await cartService.retrieveCart(cartId)
    if (!cart) {
      console.warn(`[Phone Verify] Cart ${cartId} not found`)
      return
    }
    
    // Update cart metadata with verification status
    const existingMetadata = cart.metadata || {}
    
    await cartService.updateCarts([{
      id: cartId,
      metadata: {
        ...existingMetadata,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        verified_phone: phone,
      },
    }])
    
    console.log(`[Phone Verify] Stored verification in cart ${cartId}`)
    
  } catch (error: any) {
    console.error(`[Phone Verify] Failed to store in cart: ${error.message}`)
    // Don't throw - verification succeeded even if cart update fails
  }
}

