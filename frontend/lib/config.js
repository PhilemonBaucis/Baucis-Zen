import Medusa from "@medusajs/js-sdk"

if (!process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  throw new Error("Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL")
}

export const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

