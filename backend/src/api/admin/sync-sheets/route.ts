/**
 * Admin API endpoint to trigger Google Sheets sync
 * 
 * POST /admin/sync-sheets - Trigger sync (requires admin auth OR sync secret)
 * GET /admin/sync-sheets - Check configuration status
 * 
 * For cron jobs or external triggers, you can use a secret key:
 * POST /admin/sync-sheets with header: x-sync-secret: YOUR_SECRET
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import syncFromGoogleSheets from "../../../scripts/sheets-sync"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const startTime = Date.now()
  
  console.log("========================================")
  console.log("🔄 Sync endpoint called")
  console.log(`📅 Time: ${new Date().toISOString()}`)
  console.log(`🌐 IP: ${req.ip || 'unknown'}`)
  console.log("========================================")
  
  // Optional: Allow triggering via secret key (for cron jobs)
  const syncSecret = process.env.SYNC_SECRET
  const providedSecret = req.headers['x-sync-secret']
  
  if (syncSecret && providedSecret === syncSecret) {
    console.log("✅ Authenticated via sync secret")
  } else if (!syncSecret) {
    console.log("⚠️  No SYNC_SECRET configured - endpoint is open")
  }
  
  try {
    console.log("🚀 Starting sync process...")
    
    // Run the sync
    const result = await syncFromGoogleSheets({ container: req.scope })
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log(`✅ Sync completed in ${duration}s`)
    console.log(`   Created: ${result?.created || 0}`)
    console.log(`   Updated: ${result?.updated || 0}`)
    console.log(`   Skipped: ${result?.skipped || 0}`)
    console.log(`   Errors: ${result?.errors?.length || 0}`)
    
    res.json({
      success: true,
      message: "Google Sheets sync completed",
      duration: `${duration}s`,
      result: {
        created: result?.created || 0,
        updated: result?.updated || 0,
        skipped: result?.skipped || 0,
        errors: result?.errors || [],
      },
      timestamp: new Date().toISOString(),
    })
    
  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.error(`❌ Sync failed after ${duration}s`)
    console.error(`   Error: ${error.message}`)
    console.error(`   Stack: ${error.stack}`)
    
    res.status(500).json({
      success: false,
      message: "Sync failed",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    })
  }
}

// GET endpoint to check sync status/health
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  console.log("📋 Sync config check requested")
  
  const config = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
    S3_ENDPOINT: !!process.env.S3_ENDPOINT,
    S3_ACCESS_KEY_ID: !!process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: !!process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET: !!process.env.S3_BUCKET,
    S3_FILE_URL: !!process.env.S3_FILE_URL,
    SYNC_SECRET: !!process.env.SYNC_SECRET,
  }
  
  const hasGoogleConfig = config.GOOGLE_SHEET_ID && 
                          config.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
                          config.GOOGLE_PRIVATE_KEY
  
  const hasR2Config = config.S3_ENDPOINT && 
                      config.S3_ACCESS_KEY_ID && 
                      config.S3_SECRET_ACCESS_KEY
  
  const allConfigured = hasGoogleConfig && hasR2Config && config.DATABASE_URL
  
  res.json({
    endpoint: "/admin/sync-sheets",
    method: "POST to trigger sync, GET for status",
    status: allConfigured ? "✅ ready" : "⚠️ missing configuration",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    configuration: {
      database: config.DATABASE_URL ? "✅ configured" : "❌ missing DATABASE_URL",
      googleSheets: hasGoogleConfig ? "✅ configured" : "❌ missing",
      cloudflareR2: hasR2Config ? "✅ configured" : "❌ missing",
      syncSecret: config.SYNC_SECRET ? "✅ configured" : "⚠️ not set (endpoint open)",
    },
    details: {
      sheetId: process.env.GOOGLE_SHEET_ID 
        ? `${process.env.GOOGLE_SHEET_ID.substring(0, 15)}...` 
        : "not set",
      sheetTab: process.env.GOOGLE_SHEET_TAB || "Products (default)",
      serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "not set",
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      r2Bucket: process.env.S3_BUCKET || "not set",
      r2PublicUrl: process.env.S3_FILE_URL 
        ? `${process.env.S3_FILE_URL.substring(0, 30)}...` 
        : "not set",
    },
    envVarStatus: Object.entries(config).map(([key, value]) => ({
      name: key,
      status: value ? "✅" : "❌",
    })),
    usage: {
      checkConfig: "GET /admin/sync-sheets",
      triggerSync: "POST /admin/sync-sheets",
      withSecret: "POST /admin/sync-sheets with header 'x-sync-secret: YOUR_SECRET'",
    },
  })
}

