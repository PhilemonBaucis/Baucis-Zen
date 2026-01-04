/**
 * Support Chat API Endpoint
 * 
 * POST /store/chat
 * 
 * Provides AI-powered customer support using Google Gemini.
 * Requires JWT authentication - only available to logged-in users.
 * 
 * Request body:
 * - message: string (user's message)
 * - locale: string (user's language: en, de, fr, it, es, tr, el, sq)
 * - history?: Array<{role: 'user' | 'assistant', content: string}> (conversation context)
 * 
 * Response:
 * - response: string (AI assistant's response)
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requireClerkAuth, sendAuthError } from "../../middlewares/clerk-auth"
import { applyRateLimit, getChatLimiter } from "../../../lib/rate-limiter"
import { buildSystemPrompt, CustomerContext, OrderContext } from "../../../lib/chat-context"
import { sanitizeClerkId } from "../../../lib/log-utils"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatRequestBody {
  message: string
  locale: string
  history?: ChatMessage[]
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const authHeader = req.headers.authorization as string | undefined
  
  // Require JWT authentication
  const authResult = await requireClerkAuth(authHeader)
  
  if (!authResult.authenticated) {
    return sendAuthError(res, authResult)
  }
  
  const clerkId = authResult.clerkId
  
  // Apply rate limiting (per user)
  const rateLimitOk = await applyRateLimit(req, res, getChatLimiter, clerkId)
  if (!rateLimitOk) {
    return // Rate limit response already sent
  }
  
  // Debug logging - capture everything about the request
  console.log("[Chat] === DEBUG START ===")
  console.log("[Chat] Headers:", JSON.stringify(req.headers))
  console.log("[Chat] Body type:", typeof req.body)
  console.log("[Chat] Body:", JSON.stringify(req.body))
  console.log("[Chat] Raw body keys:", req.body ? Object.keys(req.body) : "no body")
  console.log("[Chat] === DEBUG END ===")
  
  // Validate request body
  const { message, locale, history } = (req.body || {}) as ChatRequestBody
  
  if (!message || typeof message !== "string") {
    console.log("[Chat] ❌ Validation failed - message:", message, "type:", typeof message)
    return res.status(400).json({
      error: "Message is required",
      debug: {
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        hasMessage: !!message,
        messageType: typeof message,
      }
    })
  }
  
  if (message.length > 2000) {
    return res.status(400).json({
      error: "Message too long (max 2000 characters)",
    })
  }
  
  const userLocale = locale || "en"
  
  // Check Gemini API key
  if (!GEMINI_API_KEY) {
    console.error("[Chat] ❌ GEMINI_API_KEY not configured")
    return res.status(503).json({
      error: "Chat service unavailable",
    })
  }
  
  try {
    // Get customer data from Medusa
    const customerModule = req.scope.resolve("customer")
    const orderModule = req.scope.resolve("order")
    
    // Find customer by clerk_id in metadata
    const customers = await customerModule.listCustomers({
      // @ts-ignore - metadata filter works
      metadata: { clerk_id: clerkId },
    })
    
    let customerContext: CustomerContext | null = null
    let ordersContext: OrderContext[] = []
    
    if (customers && customers.length > 0) {
      const customer = customers[0]
      
      // Extract zen points if available and properly structured
      type ZenPointsType = {
        current_balance: number
        tier: string
        discount_percent: number
        lifetime_points: number
      }
      
      const rawZenPoints = customer.metadata?.zen_points as ZenPointsType | undefined
      const zenPoints = rawZenPoints && 
        typeof rawZenPoints.current_balance === 'number' &&
        typeof rawZenPoints.tier === 'string'
          ? rawZenPoints
          : undefined
      
      customerContext = {
        id: customer.id,
        email: customer.email || "",
        firstName: customer.first_name || undefined,
        lastName: customer.last_name || undefined,
        phone: customer.phone || undefined,
        zenPoints,
        createdAt: customer.created_at 
          ? (typeof customer.created_at === 'string' 
              ? customer.created_at 
              : customer.created_at.toISOString())
          : undefined,
      }
      
      // Get order history
      try {
        const orders = await orderModule.listOrders(
          { customer_id: customer.id },
          { 
            select: ["id", "display_id", "status", "total", "currency_code", "created_at"],
            relations: ["items"],
            order: { created_at: "DESC" },
            take: 10,
          }
        )
        
        ordersContext = orders.map((order: any) => ({
          id: order.id,
          displayId: order.display_id,
          status: order.status,
          total: order.total,
          currency: order.currency_code,
          itemCount: order.items?.length || 0,
          createdAt: order.created_at 
            ? (typeof order.created_at === 'string' 
                ? order.created_at 
                : order.created_at.toISOString())
            : new Date().toISOString(),
        }))
      } catch (orderError) {
        console.warn("[Chat] Could not fetch orders:", orderError)
      }
    }
    
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(userLocale, customerContext, ordersContext)
    
    // Build conversation for Gemini
    const contents: any[] = []
    
    // Add conversation history if provided
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })
      }
    }
    
    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    })
    
    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ],
        }),
      }
    )
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("[Chat] Gemini API error:", geminiResponse.status, errorText.substring(0, 200))
      return res.status(502).json({
        error: "Failed to get AI response",
      })
    }
    
    const geminiData = await geminiResponse.json()
    
    // Check for API-level errors
    if (geminiData.error) {
      console.error("[Chat] Gemini API error:", geminiData.error.message)
      return res.status(502).json({
        error: "Failed to get AI response",
      })
    }
    
    // Extract response text
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!responseText) {
      console.error("[Chat] Empty response from Gemini")
      return res.status(502).json({
        error: "Empty response from AI",
      })
    }
    
    // Log for debugging (sanitized)
    console.log(`[Chat] ✅ Response for ${sanitizeClerkId(clerkId)} (${userLocale}): ${responseText.substring(0, 50)}...`)
    
    return res.json({
      response: responseText,
    })
    
  } catch (error: any) {
    console.error("[Chat] Error:", error.message)
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

