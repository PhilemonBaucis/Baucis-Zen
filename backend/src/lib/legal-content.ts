/**
 * Legal Content Provider
 * 
 * This module provides legal documentation content for the AI chatbot.
 * Content is loaded from a structured format that can be easily updated
 * or connected to an external source (database, CMS, etc.) in the future.
 * 
 * TODO: Consider syncing this with frontend messages/*.json legal sections
 * or loading from a shared database/CMS for single source of truth.
 */

export interface LegalSection {
  key: string;
  title: string;
  summary: string;
  details: string[];
}

export interface LegalContent {
  sections: LegalSection[];
  lastUpdated: string;
}

/**
 * Legal documentation content
 * 
 * Keep this in sync with frontend legal pages:
 * - baucis-frontend/app/[locale]/(store)/legal/shipping/page.js
 * - baucis-frontend/app/[locale]/(store)/legal/returns/page.js
 * - baucis-frontend/app/[locale]/(store)/legal/withdrawal/page.js
 * - baucis-frontend/app/[locale]/(store)/legal/privacy/page.js
 * - baucis-frontend/app/[locale]/(store)/legal/terms/page.js
 * 
 * Source translations: baucis-frontend/messages/en.json -> "legal" section
 */
const legalContent: LegalContent = {
  lastUpdated: "2025-12-21",
  sections: [
    {
      key: "shipping",
      title: "Shipping Policy",
      summary: "Delivery options, times, and costs for Baucis Zen orders in Albania and Kosovo",
      details: [
        "Shipping partner: Ultra C.E.P SHPK (licensed under Albanian Law No. 46/2015)",
        "Tirana: 250 ALL - Delivery within 24 hours",
        "Albania (National): 360 ALL - Delivery within 24-72 hours",
        "Kosovo: €7.00 - Delivery within 4 days",
        "Weight surcharge: +50 ALL per kg over 2 kg base weight",
        "Tracking: SMS with real-time tracking link sent to recipient",
        "Orders processed Monday-Friday, 9:00-17:00 CET",
        "Orders placed before 14:00 CET typically ship same day",
        "Liability: Up to 2,000 ALL for letters, 5,000 ALL for parcels",
        "Optional insurance: 1% of declared value (minimum €5)",
        "Contact: logistics@bauciszen.com for shipping inquiries",
      ],
    },
    {
      key: "returns",
      title: "Returns Policy",
      summary: "How to return products and get refunds",
      details: [
        "14-day return window from delivery date",
        "Items must be unused and in original packaging",
        "Items must be in resalable condition",
        "Return shipping costs are paid by the customer",
        "If package is refused by recipient, sender pays return costs",
        "Non-returnable: opened food products (matcha, teas) for hygiene",
        "Non-returnable: personalized or custom-made items",
        "Non-returnable: items marked as final sale",
        "Process: Email logistics@bauciszen.com with order number",
        "We respond with return instructions within 1-2 business days",
        "Refund processed within 5-10 business days after inspection",
        "Refund applied to original payment method",
      ],
    },
    {
      key: "withdrawal",
      title: "Right of Withdrawal (EU Consumer Rights)",
      summary: "Your legal right to cancel within 14 days",
      details: [
        "EU consumers can withdraw within 14 days without reason",
        "Period starts when you physically receive the goods",
        "To withdraw: send clear statement via email or post",
        "You can use our model withdrawal form",
        "Refund issued within 14 days of receiving withdrawal notice",
        "We refund all payments including original delivery costs",
        "We may withhold refund until goods are returned to us",
        "Customer pays return shipping costs",
        "Exclusions: sealed goods opened after delivery (hygiene)",
        "Exclusions: goods mixed with others after delivery",
        "Exclusions: personalized/custom products",
      ],
    },
    {
      key: "privacy",
      title: "Privacy Policy (GDPR)",
      summary: "How we handle your personal data",
      details: [
        "We collect: name, email, phone (optional), shipping/billing addresses",
        "We collect: order history, payment info (processed by payment providers)",
        "We collect: IP address, browser type, device info, cookies",
        "Used for: order fulfillment and communication",
        "Used for: customer support and service improvement",
        "Used for: marketing (with consent only)",
        "Third parties: Clerk (authentication), Cloudflare (security/CDN)",
        "Third parties: Vercel (hosting), Railway (backend infrastructure)",
        "Third parties: POK (payment processing - Visa, Mastercard)",
        "Third parties: Ultra C.E.P SHPK (logistics - receives recipient name, address, phone)",
        "Your GDPR rights: access, rectification, erasure, portability, objection",
        "Data retained 7 years for tax/legal requirements",
        "Contact logistics@bauciszen.com for privacy and data requests",
      ],
    },
    {
      key: "payment",
      title: "Payment Information",
      summary: "Accepted payment methods and pricing",
      details: [
        "Payment processor: POK (licensed by Bank of Albania)",
        "Accepted: Credit/Debit cards (Visa, Mastercard)",
        "Accepted: Cash on Delivery (Albania only)",
        "All prices displayed in EUR (€)",
        "VAT/taxes included in displayed prices",
        "Cash on Delivery NOT available for pre-order items",
        "Pre-order items require card payment upfront",
        "All payments processed securely and encrypted",
        "Transaction fee: 2.5% + 20 ALL per transaction",
      ],
    },
    {
      key: "zenPoints",
      title: "Zen Points Loyalty Program",
      summary: "Earn points and unlock discounts",
      details: [
        "Earn 10 Zen Points per €1 spent",
        "50 bonus points on account creation",
        "Seed tier (0+ points): 0% discount",
        "Sprout tier (100+ points): 5% discount on all products",
        "Blossom tier (250+ points): 10% discount on all products",
        "Lotus tier (500+ points): 15% discount on all products",
        "Points reset after 30 days of inactivity",
        "Play daily Zen Memory game to earn +10 points",
        "Discount applied automatically at checkout",
      ],
    },
    {
      key: "general",
      title: "About Baucis Zen",
      summary: "Who we are and what we do",
      details: [
        "Premium wellness and matcha e-commerce store",
        "Specializing in ceremonial grade matcha",
        "Wellness kits and mindful living essentials",
        "Based in Europe, shipping EU-wide",
        "Focus on quality, authenticity, and sustainability",
        "Customer support via chat and email",
        "Contact: logistics@bauciszen.com for all inquiries",
      ],
    },
  ],
};

/**
 * Get all legal content formatted for AI context
 */
export function getLegalContext(): string {
  let context = `STORE POLICIES AND INFORMATION (Last updated: ${legalContent.lastUpdated})\n\n`;
  
  for (const section of legalContent.sections) {
    context += `=== ${section.title.toUpperCase()} ===\n`;
    context += `${section.summary}\n\n`;
    for (const detail of section.details) {
      context += `• ${detail}\n`;
    }
    context += "\n";
  }
  
  return context;
}

/**
 * Get specific legal section by key
 */
export function getLegalSection(key: string): LegalSection | undefined {
  return legalContent.sections.find(s => s.key === key);
}

/**
 * Get all section keys
 */
export function getLegalSectionKeys(): string[] {
  return legalContent.sections.map(s => s.key);
}

/**
 * Get last updated date
 */
export function getLegalLastUpdated(): string {
  return legalContent.lastUpdated;
}

export default legalContent;

