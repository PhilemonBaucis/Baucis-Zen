/**
 * Phone Verification - Send SMS Code
 * 
 * Sends a verification code via Twilio Verify API
 * Rate limited to prevent SMS bombing
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyRateLimit, getPhoneVerifyLimiter } from "../../../../lib/rate-limiter"

// Twilio client (lazy initialization)
let twilioClient: any = null

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured")
    }
    
    // Dynamic import to avoid issues if twilio is not installed
    const twilio = require("twilio")
    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

/**
 * Validate phone number format (E.164)
 * E.164: +[country code][number], e.g., +355691234567
 */
function validatePhoneNumber(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone) {
    return { valid: false, normalized: "", error: "Phone number is required" }
  }
  
  // Remove spaces and normalize
  let normalized = phone.replace(/\s+/g, "").trim()
  
  // Ensure it starts with +
  if (!normalized.startsWith("+")) {
    return { valid: false, normalized: "", error: "Phone number must include country code (e.g., +355)" }
  }
  
  // Check length (E.164 is max 15 digits including country code)
  const digitsOnly = normalized.replace(/\D/g, "")
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return { valid: false, normalized: "", error: "Invalid phone number length" }
  }
  
  return { valid: true, normalized }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { phone } = req.body as { phone?: string }
    
    // Validate phone number
    const validation = validatePhoneNumber(phone || "")
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      })
    }
    
    const normalizedPhone = validation.normalized
    
    // Check if Twilio is configured
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
    if (!serviceSid) {
      console.error("[Phone Verify] TWILIO_VERIFY_SERVICE_SID not configured")
      
      // In development, allow bypass
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Phone Verify] ⚠️ Development mode - SMS would be sent to:", normalizedPhone)
        return res.json({ 
          success: true, 
          message: "Development mode - no SMS sent",
          dev_bypass: true
        })
      }
      
      return res.status(503).json({ 
        success: false, 
        error: "Phone verification service not available" 
      })
    }
    
    // Apply rate limit (by phone number to prevent SMS bombing)
    const rateLimitOk = await applyRateLimit(req, res, getPhoneVerifyLimiter, `phone:${normalizedPhone}`)
    if (!rateLimitOk) {
      return // Response already sent by rate limiter
    }
    
    // Send verification code via Twilio
    const client = getTwilioClient()
    
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: normalizedPhone,
        channel: "sms",
      })
    
    console.log(`[Phone Verify] SMS sent to ${normalizedPhone.slice(0, -4)}****, status: ${verification.status}`)
    
    return res.json({ 
      success: true,
      status: verification.status,
      message: "Verification code sent"
    })
    
  } catch (error: any) {
    console.error("[Phone Verify] Error sending SMS:", error.message)
    
    // Handle specific Twilio errors
    if (error.code === 60200) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid phone number format" 
      })
    }
    
    if (error.code === 60203) {
      return res.status(429).json({ 
        success: false, 
        error: "Too many verification attempts. Please try again later." 
      })
    }
    
    if (error.code === 60205) {
      return res.status(400).json({ 
        success: false, 
        error: "SMS not supported for this phone number" 
      })
    }
    
    return res.status(500).json({ 
      success: false, 
      error: "Failed to send verification code. Please try again." 
    })
  }
}

