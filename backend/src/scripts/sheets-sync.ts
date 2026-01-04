/**
 * Google Sheets Product Sync Script
 * 
 * Syncs products from Google Sheets to Medusa database with:
 * - Delta restock logic (adds to existing inventory)
 * - Google Drive image upload to Cloudflare R2
 * - Change detection for prices/titles/descriptions
 * - Automatic translation to 8 languages via Google Gemini API
 * 
 * Run with: medusa exec ./src/scripts/sheets-sync.ts
 */

import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"
import { google } from "googleapis"
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3"
import * as https from "https"
import * as http from "http"

// Translation module
import {
  translateProduct,
  isTranslationEnabled,
  TranslationMetadata,
  TARGET_LOCALES,
} from "./product-translations"

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Parse Google private key from environment variable.
 * Handles multiple formats that can occur in different environments:
 * - Railway/Heroku: literal \n characters need conversion
 * - Local .env: may have escaped \\n or quoted strings
 * - JSON format: may have extra escaping
 */
function parseGooglePrivateKey(rawKey: string | undefined): string {
  if (!rawKey) return ""
  
  let key = rawKey
  
  // Step 1: Remove surrounding quotes if present (some env loaders add these)
  if ((key.startsWith('"') && key.endsWith('"')) || 
      (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1)
  }
  
  // Step 2: Handle double-escaped newlines (\\n -> \n -> actual newline)
  // This handles cases where the key was JSON-stringified
  key = key.replace(/\\\\n/g, "\n")
  
  // Step 3: Handle single-escaped newlines (\n -> actual newline)
  key = key.replace(/\\n/g, "\n")
  
  // Step 4: Validate key format
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    console.error("⚠️ Private key appears malformed - missing BEGIN/END markers")
    console.error(`   Key starts with: ${key.substring(0, 50)}...`)
  }
  
  return key
}

const CONFIG = {
  // Google Sheets
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID!,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
  GOOGLE_PRIVATE_KEY: parseGooglePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  
  // Cloudflare R2 (S3-compatible)
  R2_ENDPOINT: process.env.S3_ENDPOINT!,
  R2_ACCESS_KEY: process.env.S3_ACCESS_KEY_ID!,
  R2_SECRET_KEY: process.env.S3_SECRET_ACCESS_KEY!,
  R2_BUCKET: process.env.S3_BUCKET || "baucis-assets",
  R2_PUBLIC_URL: process.env.S3_FILE_URL!,
  
  // Sheet tab name
  SHEET_TAB: process.env.GOOGLE_SHEET_TAB || "Products",
}

// =============================================================================
// TYPES
// =============================================================================
interface SheetProduct {
  row: number
  // Column A-D: Core product data
  sku: string              // A: SKU (immutable identifier)
  title: string            // B: Title
  subtitle: string         // C: Subtitle
  description: string      // D: Description
  
  // Column E: Costs (NOT synced - internal use only)
  // costs: number         // E: Costs (skipped, for internal use)
  
  // Columns F-H: Price, Inventory, Location
  price: number            // F: Price (EUR)
  restockQty: number       // G: Restock Qty (delta add to inventory)
  location?: string        // H: Stock location name
  
  // Columns I-J: Category & Collection
  category?: string        // I: Category name
  collection?: string      // J: Collection name
  
  // Columns K-N: Images
  thumbnailUrl?: string    // K: Thumbnail URL
  imageUrl2?: string       // L: Additional image
  imageUrl3?: string       // M: Additional image
  imageUrl4?: string       // N: Additional image
  
  // Columns O-R: Dimensions & Weight
  height?: number          // O: Height (mm)
  width?: number           // P: Width (mm)
  length?: number          // Q: Length (mm)
  weight?: number          // R: Weight (g)
  
  // Columns S-U: Codes & Origin
  midCode?: string         // S: MID code (Manufacturer ID)
  hsCode?: string          // T: HS code (Harmonized System for customs)
  originCountry?: string   // U: Country of origin (2-letter code)
  
  // Columns V-W: Tags & EAN
  tags?: string[]          // V: Tags (comma-separated in sheet)
  ean?: string             // W: EAN barcode
  
  // Columns X-Y: Handle & Sync
  handle: string           // X: Handle (URL slug)
  handleWasGenerated?: boolean // True if handle was auto-generated from title
  // Y: Last Synced (auto-updated by script)
}

interface SyncResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================
export default async function syncFromGoogleSheets({ container }: { container: any }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  logger.info("========================================")
  logger.info("🔄 Starting Google Sheets Product Sync")
  logger.info("========================================")
  logger.info(`📅 Time: ${new Date().toISOString()}`)
  logger.info(`🌍 Translation: ${isTranslationEnabled() ? `Enabled (${TARGET_LOCALES.length} languages)` : 'Disabled (GEMINI_API_KEY not set)'}`)
  
  // Debug: Show key parsing info
  const rawKeyLength = process.env.GOOGLE_PRIVATE_KEY?.length || 0
  const parsedKeyLength = CONFIG.GOOGLE_PRIVATE_KEY?.length || 0
  const hasNewlines = CONFIG.GOOGLE_PRIVATE_KEY?.includes('\n') || false
  const newlineCount = (CONFIG.GOOGLE_PRIVATE_KEY?.match(/\n/g) || []).length
  
  logger.info(`🔑 Google Auth Debug:`)
  logger.info(`   Service Account: ${CONFIG.GOOGLE_SERVICE_ACCOUNT_EMAIL || '❌ NOT SET'}`)
  logger.info(`   Sheet ID: ${CONFIG.GOOGLE_SHEET_ID || '❌ NOT SET'}`)
  logger.info(`   Private Key: ${parsedKeyLength} chars, ${newlineCount} newlines`)
  logger.info(`   Key valid format: ${hasNewlines && CONFIG.GOOGLE_PRIVATE_KEY?.includes('-----BEGIN') ? '✅' : '❌'}`)
  
  // Validate configuration
  if (!CONFIG.GOOGLE_SHEET_ID || !CONFIG.GOOGLE_SERVICE_ACCOUNT_EMAIL || !CONFIG.GOOGLE_PRIVATE_KEY) {
    logger.error("❌ Missing Google Sheets configuration. Required env vars:")
    logger.error("   - GOOGLE_SHEET_ID")
    logger.error("   - GOOGLE_SERVICE_ACCOUNT_EMAIL")
    logger.error("   - GOOGLE_PRIVATE_KEY")
    throw new Error("Missing Google Sheets configuration")
  }
  
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }
  
  try {
    // 1. Initialize Google Sheets API
    logger.info("📊 Connecting to Google Sheets...")
    const sheets = await initGoogleSheets()
    
    // 2. Fetch products from sheet
    const sheetProducts = await fetchSheetProducts(sheets, logger)
    logger.info(`📋 Found ${sheetProducts.length} products in Google Sheets`)
    
    if (sheetProducts.length === 0) {
      logger.warn("⚠️ No products found in sheet. Check sheet structure.")
      return result
    }
    
    // 3. Initialize R2 client for image uploads
    const r2Client = initR2Client()
    
    // 3b. Clean up old timestamped images from R2
    await cleanupOldImages(r2Client, logger)
    
    // 4. Get existing products from Medusa
    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: [
        "id", 
        "handle", 
        "title", 
        "subtitle",
        "description",
        "thumbnail",
        "metadata",
        "variants.id",
        "variants.sku",
        "variants.ean",
        "variants.mid_code",
        "variants.height",
        "variants.width",
        "variants.length",
        "variants.weight",
        "variants.hs_code",
        "variants.origin_country",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "images.id",
        "images.url",
        "categories.id",
        "categories.name",
        "collection_id",
        "tags.id",
        "tags.value",
      ],
    })
    
    const existingByHandle = new Map<string, any>()
    const existingBySku = new Map<string, any>()
    
    for (const product of existingProducts) {
      existingByHandle.set(product.handle, product)
      if (product.variants?.[0]?.sku) {
        existingBySku.set(product.variants[0].sku, product)
      }
    }
    
    logger.info(`📦 Found ${existingProducts.length} existing products in Medusa`)
    
    // 5. Get sales channel and shipping profile
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    
    let salesChannels = await salesChannelService.listSalesChannels({
      name: "Default Sales Channel",
    })
    
    if (!salesChannels.length) {
      salesChannels = await salesChannelService.listSalesChannels({})
    }
    
    if (!salesChannels.length) {
      throw new Error("No sales channel found. Please create one in Medusa Admin.")
    }
    
    const salesChannel = salesChannels[0]
    
    const shippingProfiles = await fulfillmentService.listShippingProfiles({
      type: "default",
    })
    
    if (!shippingProfiles.length) {
      throw new Error("No shipping profile found. Please run seed or create one.")
    }
    
    const shippingProfile = shippingProfiles[0]
    
    // 6. Get stock locations for inventory
    const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
    const stockLocations = await stockLocationService.listStockLocations({})
    
    if (!stockLocations.length) {
      logger.warn("⚠️ No stock locations found. Inventory levels won't be set.")
      logger.warn("   Create one in Medusa Admin: Settings → Locations")
    } else {
      logger.info(`📍 Found ${stockLocations.length} stock location(s): ${stockLocations.map((l: any) => l.name).join(", ")}`)
    }
    
    // 6b. Get categories, collections, and tags for product linking
    const productService = container.resolve(Modules.PRODUCT)
    
    // Get all categories using query graph (more reliable in Medusa v2)
    let allCategories: any[] = []
    try {
      // Try query graph first (preferred in Medusa v2)
      const { data: categoriesData } = await query.graph({
        entity: "product_category",
        fields: ["id", "name", "handle"],
      })
      allCategories = categoriesData || []
      logger.info(`📂 Query returned ${allCategories.length} categories`)
    } catch (queryError: any) {
      logger.warn(`⚠️ Query graph failed for categories: ${queryError.message}`)
      // Fallback to product service
      try {
        const categoriesResult = await productService.listProductCategories({}, { take: 1000 })
        allCategories = Array.isArray(categoriesResult) ? categoriesResult : (categoriesResult as any)?.product_categories || []
      } catch (catError: any) {
        logger.warn(`⚠️ Could not fetch categories: ${catError.message}`)
      }
    }
    const categoryByName = new Map<string, any>()
    for (const cat of allCategories) {
      if (cat.name) {
        categoryByName.set(cat.name.toLowerCase(), cat)
        logger.info(`   📂 Category: "${cat.name}" (id: ${cat.id})`)
      }
    }
    logger.info(`📂 Found ${allCategories.length} categories in lookup map`)
    
    // Get all collections and build lookup map by title (case-insensitive)
    let allCollections: any[] = []
    try {
      const collectionsResult = await productService.listProductCollections({}, { take: 1000 })
      allCollections = Array.isArray(collectionsResult) ? collectionsResult : (collectionsResult as any)?.product_collections || []
    } catch (colError: any) {
      logger.warn(`⚠️ Could not fetch collections: ${colError.message}`)
    }
    const collectionByName = new Map<string, any>()
    for (const col of allCollections) {
      if (col.title) {
        collectionByName.set(col.title.toLowerCase(), col)
      }
    }
    logger.info(`📦 Found ${allCollections.length} collections`)
    
    // Get all tags and build lookup map by value (case-insensitive)
    let allTags: any[] = []
    try {
      const tagsResult = await productService.listProductTags({}, { take: 1000 })
      allTags = Array.isArray(tagsResult) ? tagsResult : (tagsResult as any)?.product_tags || []
    } catch (tagError: any) {
      logger.warn(`⚠️ Could not fetch tags: ${tagError.message}`)
    }
    const tagByValue = new Map<string, any>()
    for (const tag of allTags) {
      if (tag.value) {
        tagByValue.set(tag.value.toLowerCase(), tag)
      }
    }
    logger.info(`🏷️ Found ${allTags.length} tags`)
    
    // 7. Process each product
    const productsToCreate: any[] = []
    const productsToUpdate: { id: string; data: any; existingImageIds: string[] }[] = []
    const inventoryUpdates: { 
      sku: string
      quantity: number
      title: string
      location?: string
      height?: number
      width?: number
      length?: number
      weight?: number
      hsCode?: string
      originCountry?: string
      midCode?: string
    }[] = []
    
    for (const sheetProduct of sheetProducts) {
      try {
        logger.info(`\n📝 Processing: ${sheetProduct.title} (${sheetProduct.sku})`)
        
        // Debug: Log attributes if any are present
        const attrs: string[] = []
        if (sheetProduct.height !== undefined) attrs.push(`H:${sheetProduct.height}`)
        if (sheetProduct.width !== undefined) attrs.push(`W:${sheetProduct.width}`)
        if (sheetProduct.length !== undefined) attrs.push(`L:${sheetProduct.length}`)
        if (sheetProduct.weight !== undefined) attrs.push(`Wt:${sheetProduct.weight}`)
        if (sheetProduct.midCode) attrs.push(`MID:${sheetProduct.midCode}`)
        if (sheetProduct.hsCode) attrs.push(`HS:${sheetProduct.hsCode}`)
        if (sheetProduct.originCountry) attrs.push(`Origin:${sheetProduct.originCountry}`)
        if (attrs.length > 0) {
          logger.info(`   📐 Attributes: ${attrs.join(", ")}`)
        }
        
        // Check if product exists
        const existingProduct = existingBySku.get(sheetProduct.sku) || 
                               existingByHandle.get(sheetProduct.handle)
        
        // Build list of source image URLs from sheet
        const sheetImageUrls = [
          sheetProduct.thumbnailUrl,
          sheetProduct.imageUrl2,
          sheetProduct.imageUrl3,
          sheetProduct.imageUrl4,
        ].filter((url): url is string => !!url && url.length > 0)
        
        // Check if images have changed by comparing with stored source URLs in metadata
        let imagesChanged = true
        if (existingProduct) {
          const storedSourceUrls = existingProduct.metadata?.source_image_urls || []
          // Compare arrays - images changed if different length or different URLs
          if (Array.isArray(storedSourceUrls) && 
              storedSourceUrls.length === sheetImageUrls.length &&
              storedSourceUrls.every((url: string, i: number) => url === sheetImageUrls[i])) {
            imagesChanged = false
            logger.info(`   📷 Images unchanged, skipping upload`)
          }
        }
        
        // Upload images to R2 ONLY if URLs changed or new product
        let uploadResult: UploadResult = { thumbnailUrl: null, imageUrls: [] }
        if (sheetImageUrls.length > 0 && imagesChanged) {
          uploadResult = await uploadProductImages(r2Client, sheetProduct, logger)
          // Store source URLs in metadata for future comparison
          uploadResult.sourceUrls = sheetImageUrls
        } else if (sheetImageUrls.length > 0 && !imagesChanged && existingProduct) {
          // Keep existing R2 URLs if images didn't change
          uploadResult.thumbnailUrl = existingProduct.thumbnail || null
          uploadResult.imageUrls = (existingProduct.images || []).slice(1).map((img: any) => img.url)
          uploadResult.keepExisting = true
        }
        
        if (existingProduct) {
          // === UPDATE EXISTING PRODUCT ===
          // Always sync: title, description, price, thumbnail, images from sheet (SKU is immutable identifier)
          const changes = detectChanges(existingProduct, sheetProduct, uploadResult, logger)
          
          // Check if translations need to be updated
          const existingMetadata = existingProduct.metadata as TranslationMetadata | null
          const titleChanged = changes.title && changes.title !== existingProduct.title
          const subtitleChanged = changes.subtitle && changes.subtitle !== existingProduct.subtitle
          const descChanged = changes.description && changes.description !== existingProduct.description
          const needsTranslation = isTranslationEnabled() && (
            titleChanged || 
            subtitleChanged ||
            descChanged || 
            !existingMetadata?.translations ||
            Object.keys(existingMetadata?.translations?.title || {}).length < 2
          )
          
          if (needsTranslation) {
            const currentTitle = changes.title || existingProduct.title
            const currentSubtitle = changes.subtitle || existingProduct.subtitle || ''
            const currentDesc = changes.description || existingProduct.description || ''
            
            const { metadata: translatedMetadata } = await translateProduct(
              currentTitle,
              currentSubtitle,
              currentDesc,
              existingMetadata,
              logger
            )
            
            // Merge translations with existing metadata, preserving source_image_urls
            changes.metadata = {
              ...existingMetadata,
              ...translatedMetadata,
              source_image_urls: existingMetadata?.source_image_urls || uploadResult.sourceUrls,
            }
          }
          
          if (Object.keys(changes).length > 0) {
            // Collect existing image IDs to delete before updating
            const existingImageIds = (existingProduct.images || [])
              .map((img: any) => img.id)
              .filter((id: string) => !!id)
            
            productsToUpdate.push({
              id: existingProduct.id,
              data: changes,
              existingImageIds,
            })
            const changeList = Object.keys(changes).map(key => {
              if (key === 'images') {
                const existingCount = existingProduct.images?.length || 0
                return `images (${existingCount} → ${uploadResult.imageUrls.length})`
              }
              if (key === 'thumbnail') {
                return `thumbnail`
              }
              if (key === 'metadata') {
                return 'translations'
              }
              return key
            })
            logger.info(`   ✏️ Will sync from sheet: ${changeList.join(", ")}`)
          } else {
            result.skipped++
            logger.info(`   ⏭️ No data in sheet to sync`)
          }
          
          // Handle restock (delta add to inventory) OR attribute updates
          const hasAttributes = sheetProduct.height !== undefined || 
                               sheetProduct.width !== undefined || 
                               sheetProduct.length !== undefined || 
                               sheetProduct.weight !== undefined ||
                               sheetProduct.hsCode || 
                               sheetProduct.originCountry || 
                               sheetProduct.midCode
          
          if (sheetProduct.restockQty > 0 || hasAttributes) {
            inventoryUpdates.push({
              sku: sheetProduct.sku,
              quantity: sheetProduct.restockQty, // 0 if no restock
              title: sheetProduct.title,
              location: sheetProduct.location,
              // Include dimensions for inventory item update
              height: sheetProduct.height,
              width: sheetProduct.width,
              length: sheetProduct.length,
              weight: sheetProduct.weight,
              hsCode: sheetProduct.hsCode,
              originCountry: sheetProduct.originCountry,
              midCode: sheetProduct.midCode,
            })
            if (sheetProduct.restockQty > 0) {
              logger.info(`   📦 Will add ${sheetProduct.restockQty} to inventory${sheetProduct.location ? ` at "${sheetProduct.location}"` : ''}`)
            }
            if (hasAttributes) {
              logger.info(`   📐 Will update inventory item attributes`)
            }
          }
          
        } else {
          // === CREATE NEW PRODUCT ===
          // Combine thumbnail and additional images for the images array
          const allImageUrls = [
            ...(uploadResult.thumbnailUrl ? [uploadResult.thumbnailUrl] : []),
            ...uploadResult.imageUrls,
          ]
          
          // Build variant with all fields
          const variantData: any = {
            title: sheetProduct.title, // Variant title matches product title
            sku: sheetProduct.sku,
            options: { Default: "Default" },
            prices: [
              {
                amount: Math.round(sheetProduct.price), // Price already in cents from sheet
                currency_code: "eur",
              },
            ],
            manage_inventory: true,
          }
          
          // Add dimensions if provided
          if (sheetProduct.height !== undefined) variantData.height = sheetProduct.height
          if (sheetProduct.width !== undefined) variantData.width = sheetProduct.width
          if (sheetProduct.length !== undefined) variantData.length = sheetProduct.length
          if (sheetProduct.weight !== undefined) variantData.weight = sheetProduct.weight
          
          // Add codes and origin
          if (sheetProduct.midCode) variantData.mid_code = sheetProduct.midCode
          if (sheetProduct.hsCode) variantData.hs_code = sheetProduct.hsCode
          if (sheetProduct.originCountry) variantData.origin_country = sheetProduct.originCountry
          
          // Add EAN barcode
          if (sheetProduct.ean) variantData.ean = sheetProduct.ean
          
          // Build list of source image URLs for metadata
          const sourceImageUrls = [
            sheetProduct.thumbnailUrl,
            sheetProduct.imageUrl2,
            sheetProduct.imageUrl3,
            sheetProduct.imageUrl4,
          ].filter((url): url is string => !!url && url.length > 0)
          
          // Generate translations for new product
          let productMetadata: TranslationMetadata = {
            source_image_urls: sourceImageUrls.length > 0 ? sourceImageUrls : undefined,
          }
          
          if (isTranslationEnabled()) {
            const { metadata: translatedMetadata } = await translateProduct(
              sheetProduct.title,
              sheetProduct.subtitle || '',
              sheetProduct.description || '',
              null, // No existing metadata for new products
              logger
            )
            productMetadata = {
              ...translatedMetadata,
              source_image_urls: sourceImageUrls.length > 0 ? sourceImageUrls : undefined,
            }
          }
          
          const productData: any = {
            title: sheetProduct.title,
            subtitle: sheetProduct.subtitle || undefined,
            handle: sheetProduct.handle,
            description: sheetProduct.description,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: allImageUrls.length > 0 ? allImageUrls.map((url) => ({ url })) : undefined,
            thumbnail: uploadResult.thumbnailUrl || undefined,
            options: [{ title: "Default", values: ["Default"] }],
            variants: [variantData],
            sales_channels: [{ id: salesChannel.id }],
            // Store translations and source URLs in metadata
            metadata: Object.keys(productMetadata).length > 0 ? productMetadata : undefined,
          }
          
          // Add category if specified and found
          if (sheetProduct.category) {
            const category = categoryByName.get(sheetProduct.category.toLowerCase())
            if (category) {
              productData.categories = [{ id: category.id }]
              logger.info(`   📂 Assigned to category: ${category.name}`)
            } else {
              logger.warn(`   ⚠️ Category not found: "${sheetProduct.category}"`)
            }
          }
          
          // Add collection if specified and found
          if (sheetProduct.collection) {
            const collection = collectionByName.get(sheetProduct.collection.toLowerCase())
            if (collection) {
              productData.collection_id = collection.id
              logger.info(`   📦 Assigned to collection: ${collection.title}`)
            } else {
              logger.warn(`   ⚠️ Collection not found: "${sheetProduct.collection}"`)
            }
          }
          
          // Add tags if specified
          if (sheetProduct.tags && sheetProduct.tags.length > 0) {
            const tagIds: string[] = []
            for (const tagValue of sheetProduct.tags) {
              const tag = tagByValue.get(tagValue.toLowerCase())
              if (tag) {
                tagIds.push(tag.id)
              } else {
                logger.warn(`   ⚠️ Tag not found: "${tagValue}"`)
              }
            }
            if (tagIds.length > 0) {
              productData.tags = tagIds.map(id => ({ id }))
              logger.info(`   🏷️ Assigned ${tagIds.length} tags`)
            }
          }
          
          productsToCreate.push(productData)
          
          // Set initial inventory
          if (sheetProduct.restockQty > 0) {
            inventoryUpdates.push({
              sku: sheetProduct.sku,
              quantity: sheetProduct.restockQty,
              title: sheetProduct.title,
              location: sheetProduct.location,
              // Include dimensions for inventory item
              height: sheetProduct.height,
              width: sheetProduct.width,
              length: sheetProduct.length,
              weight: sheetProduct.weight,
              hsCode: sheetProduct.hsCode,
              originCountry: sheetProduct.originCountry,
              midCode: sheetProduct.midCode,
            })
          }
          
          logger.info(`   ➕ Will create new product`)
        }
        
      } catch (error: any) {
        const errorMsg = `Error processing ${sheetProduct.sku}: ${error.message}`
        result.errors.push(errorMsg)
        logger.error(`   ❌ ${errorMsg}`)
      }
    }
    
    // 8. Execute create workflow
    if (productsToCreate.length > 0) {
      logger.info(`\n➕ Creating ${productsToCreate.length} new products...`)
      try {
        await createProductsWorkflow(container).run({
          input: { products: productsToCreate },
        })
        result.created = productsToCreate.length
        logger.info(`   ✅ Created ${productsToCreate.length} products`)
      } catch (error: any) {
        logger.error(`   ❌ Failed to create products: ${error.message}`)
        result.errors.push(`Create failed: ${error.message}`)
      }
    }
    
    // 9. Execute update workflows
    if (productsToUpdate.length > 0) {
      logger.info(`\n✏️ Updating ${productsToUpdate.length} products...`)
      const productService = container.resolve(Modules.PRODUCT)
      
      for (const update of productsToUpdate) {
        try {
          // Check if we should keep existing images (they haven't changed)
          const keepExistingImages = update.data._keepExistingImages
          delete update.data._keepExistingImages
          
          // If we have new images AND they changed, first clear existing images AND thumbnail
          if (update.data.images && update.existingImageIds.length > 0 && !keepExistingImages) {
            logger.info(`   🗑️ Clearing ${update.existingImageIds.length} old images and thumbnail from product`)
            // Clear images and thumbnail by updating product with empty values
            await productService.updateProducts(update.id, { images: [], thumbnail: null })
          } else if (keepExistingImages) {
            // Remove images from update data since we're keeping existing ones
            delete update.data.images
            delete update.data.thumbnail
          }
          
          // Set thumbnail to first image if we have new images
          if (update.data.images && update.data.images.length > 0) {
            update.data.thumbnail = update.data.images[0].url
          }
          
          // Separate product-level and variant-level updates
          const variantData = update.data.variants?.[0]
          const productData = { ...update.data }
          delete productData.variants // Remove variants from product update
          
          // Remove internal tracking fields
          const categoryName = productData._category
          const collectionName = productData._collection
          const tagNames = productData._tags
          const clearCategory = productData._clearCategory
          const clearCollection = productData._clearCollection
          const clearTags = productData._clearTags
          delete productData._category
          delete productData._collection
          delete productData._tags
          delete productData._clearCategory
          delete productData._clearCollection
          delete productData._clearTags
          
          // Update product-level fields (title, description, subtitle, images, thumbnail)
          // Also try to add attributes at product level for Admin display
          const variantAttrs = update.data.variants?.[0] || {}
          if (variantAttrs.height !== undefined) productData.height = variantAttrs.height
          if (variantAttrs.width !== undefined) productData.width = variantAttrs.width
          if (variantAttrs.length !== undefined) productData.length = variantAttrs.length
          if (variantAttrs.weight !== undefined) productData.weight = variantAttrs.weight
          if (variantAttrs.hs_code) productData.hs_code = variantAttrs.hs_code
          if (variantAttrs.mid_code !== undefined) productData.mid_code = variantAttrs.mid_code // Include null for clearing
          if (variantAttrs.origin_country) productData.origin_country = variantAttrs.origin_country
          
          // Category - OPTIONAL: set if provided, clear if empty
          if (categoryName) {
            const category = categoryByName.get(categoryName.toLowerCase())
            if (category) {
              productData.categories = [{ id: category.id }]
              logger.info(`   📂 Assigned to category: ${category.name}`)
            } else {
              logger.warn(`   ⚠️ Category not found: "${categoryName}"`)
            }
          } else if (clearCategory) {
            productData.categories = []
            logger.info(`   🧹 Clearing category`)
          }
          
          // Collection - OPTIONAL: set if provided, clear if empty
          if (collectionName) {
            const collection = collectionByName.get(collectionName.toLowerCase())
            if (collection) {
              productData.collection_id = collection.id
              logger.info(`   📦 Assigned to collection: ${collection.title}`)
            } else {
              logger.warn(`   ⚠️ Collection not found: "${collectionName}"`)
            }
          } else if (clearCollection) {
            productData.collection_id = null
            logger.info(`   🧹 Clearing collection`)
          }
          
          // Tags - OPTIONAL: set if provided, clear if empty
          if (tagNames && tagNames.length > 0) {
            const tagIds: string[] = []
            for (const tagValue of tagNames) {
              const tag = tagByValue.get(tagValue.toLowerCase())
              if (tag) {
                tagIds.push(tag.id)
              } else {
                logger.warn(`   ⚠️ Tag not found: "${tagValue}"`)
              }
            }
            if (tagIds.length > 0) {
              productData.tags = tagIds.map(id => ({ id }))
              logger.info(`   🏷️ Assigned ${tagIds.length} tags`)
            }
          } else if (clearTags) {
            productData.tags = []
            logger.info(`   🧹 Clearing tags`)
          }
          
          if (Object.keys(productData).length > 0) {
            await updateProductsWorkflow(container).run({
              input: { 
                products: [{ id: update.id, ...productData }] 
              },
            })
          }
          
          // Update variant-level fields directly via product service
          if (variantData && Object.keys(variantData).length > 1) { // > 1 because id is always present
            const variantId = variantData.id
            const variantUpdateData: Record<string, any> = {}
            
            // Variant title should match product title
            if (variantData.title) variantUpdateData.title = variantData.title
            
            // Dimensions and weight
            if (variantData.height !== undefined) variantUpdateData.height = variantData.height
            if (variantData.width !== undefined) variantUpdateData.width = variantData.width
            if (variantData.length !== undefined) variantUpdateData.length = variantData.length
            if (variantData.weight !== undefined) variantUpdateData.weight = variantData.weight
            
            // Codes and origin - include null for clearing
            if ("mid_code" in variantData) {
              variantUpdateData.mid_code = variantData.mid_code
            }
            if (variantData.hs_code !== undefined) variantUpdateData.hs_code = variantData.hs_code
            if (variantData.origin_country !== undefined) variantUpdateData.origin_country = variantData.origin_country
            
            // EAN barcode - include null for clearing
            if ("ean" in variantData) {
              variantUpdateData.ean = variantData.ean
            }
            
            // Update variant basic fields (title, dimensions, codes) via product service
            if (Object.keys(variantUpdateData).length > 0) {
              logger.info(`   🔧 Updating variant ${variantId} with: ${JSON.stringify(variantUpdateData)}`)
              let variantUpdated = false
              
              // Approach 1: Use updateProductVariants with selector and data
              try {
                const updateResult = await productService.updateProductVariants(
                  { id: variantId },
                  variantUpdateData
                )
                logger.info(`   ✅ Updated variant via selector: ${JSON.stringify(updateResult?.[0]?.id || 'success')}`)
                variantUpdated = true
              } catch (err1: any) {
                logger.warn(`   ⚠️ Selector approach failed: ${err1.message}`)
              }
              
              // Approach 2: Use updateProductVariants with id and data directly
              if (!variantUpdated) {
                try {
                  await productService.updateProductVariants(variantId, variantUpdateData)
                  logger.info(`   ✅ Updated variant via direct ID`)
                  variantUpdated = true
                } catch (err2: any) {
                  logger.warn(`   ⚠️ Direct ID approach failed: ${err2.message}`)
                }
              }
              
              // Approach 3: Use workflow as last resort
              if (!variantUpdated) {
              try {
                await updateProductVariantsWorkflow(container).run({
                  input: {
                      product_variants: [{
                        id: variantId,
                        ...variantUpdateData,
                      }],
                    },
                  })
                  logger.info(`   ✅ Updated variant via workflow`)
                  variantUpdated = true
                } catch (err3: any) {
                  logger.warn(`   ⚠️ Workflow approach failed: ${err3.message}`)
                }
              }
              
              if (variantUpdated) {
                const updatedFields = Object.keys(variantUpdateData)
                logger.info(`   📦 Updated product variant: ${updatedFields.join(", ")}`)
                
              } else {
                logger.error(`   ❌ All variant update approaches failed!`)
              }
            }
            
            // Update prices via upsertVariantPrices (handles price sets properly)
            if (variantData.prices && variantData.prices.length > 0) {
              try {
                const newPrice = variantData.prices[0]
                
                // Use the workflow which handles prices correctly
                await updateProductVariantsWorkflow(container).run({
                  input: {
                    product_variants: [{
                      id: variantId,
                      prices: [newPrice],
                    }],
                  },
                })
                logger.info(`   💰 Updated price: ${newPrice.amount} ${newPrice.currency_code}`)
              } catch (priceError: any) {
                logger.warn(`   ⚠️ Price update failed: ${priceError.message}`)
              }
            }
          }
          
          result.updated++
        } catch (error: any) {
          logger.error(`   ❌ Failed to update ${update.id}: ${error.message}`)
          result.errors.push(`Update ${update.id} failed: ${error.message}`)
        }
      }
      logger.info(`   ✅ Updated ${result.updated} products`)
    }
    
    // 10. Update inventory levels (only for products with restock qty)
    if (inventoryUpdates.length > 0 && stockLocations.length > 0) {
      logger.info(`\n📦 Updating inventory for ${inventoryUpdates.length} products...`)
      await updateInventoryLevels(container, inventoryUpdates, stockLocations, logger)
    } else if (inventoryUpdates.length > 0) {
      logger.warn(`\n⚠️ Skipping ${inventoryUpdates.length} inventory updates - no stock locations available`)
    }
    
    // 10b. Sync ALL inventory item titles to match product titles
    logger.info(`\n📝 Syncing inventory item titles...`)
    await syncInventoryItemTitles(container, sheetProducts, logger)
    
    // 11. Update "Last Synced" column in sheet
    try {
      await updateSheetSyncStatus(sheets, sheetProducts, logger)
    } catch (error: any) {
      logger.warn(`⚠️ Could not update sync status in sheet: ${error.message}`)
    }
    
    // Final summary
    logger.info("\n========================================")
    logger.info("✅ Google Sheets Sync Completed!")
    logger.info("========================================")
    logger.info(`   Created: ${result.created}`)
    logger.info(`   Updated: ${result.updated}`)
    logger.info(`   Skipped: ${result.skipped}`)
    logger.info(`   Errors:  ${result.errors.length}`)
    
    if (result.errors.length > 0) {
      logger.info("\nErrors:")
      result.errors.forEach((e) => logger.error(`   - ${e}`))
    }
    
    return result
    
  } catch (error: any) {
    logger.error(`\n❌ Sync failed: ${error.message}`)
    logger.error(error.stack)
    throw error
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function initGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CONFIG.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: CONFIG.GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  
  return google.sheets({ version: "v4", auth })
}

async function fetchSheetProducts(sheets: any, logger: any): Promise<SheetProduct[]> {
  // Expected columns (A:Y):
  // A: SKU | B: Title | C: Subtitle | D: Description | E: Costs (not synced) | F: Price
  // G: Restock Qty | H: Location | I: Category | J: Collection
  // K: Thumbnail | L-N: Additional Images
  // O: Height (mm) | P: Width (mm) | Q: Length (mm) | R: Weight (g)
  // S: MID code | T: HS code | U: Country of origin
  // V: Tags | W: EAN | X: Handle | Y: Last Synced
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
    range: `${CONFIG.SHEET_TAB}!A2:Y`, // Skip header row, read to column Y
  })
  
  const rows = response.data.values || []
  
  return rows
    .map((row: string[], index: number) => {
      // Skip empty rows - need SKU (A) and Title (B)
      if (!row[0] || !row[1]) return null
      
      const title = row[1]?.trim() || ""
      const existingHandle = row[23]?.trim() // Column X (index 23)
      
      // Generate handle from title if not provided
      const handle = existingHandle || 
                     title.toLowerCase()
                       .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                       .replace(/\s+/g, '-')          // Spaces to hyphens
                       .replace(/-+/g, '-')           // Multiple hyphens to single
                       .trim()
      
      // Parse tags from comma-separated string
      const tagsRaw = row[21]?.trim() || "" // Column V (index 21)
      const tags = tagsRaw 
        ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : []
      
      return {
        row: index + 2, // For updating sync status (1-indexed, +1 for header)
        
        // Core product data (A-D)
        sku: row[0]?.trim() || "",
        title: title,
        subtitle: row[2]?.trim() || "",
        description: row[3]?.trim() || "",
        // Note: Column E (Costs) is skipped - for internal use only
        
        // Price & Inventory (F-H)
        price: parseFloat(row[5]) || 0,       // Column F
        restockQty: parseInt(row[6]) || 0,    // Column G
        location: row[7]?.trim() || undefined, // Column H
        
        // Category & Collection (I-J)
        category: row[8]?.trim() || undefined,    // Column I
        collection: row[9]?.trim() || undefined,  // Column J
        
        // Images (K-N)
        thumbnailUrl: row[10]?.trim(),   // Column K - Thumbnail
        imageUrl2: row[11]?.trim(),      // Column L - Additional image
        imageUrl3: row[12]?.trim(),      // Column M - Additional image
        imageUrl4: row[13]?.trim(),      // Column N - Additional image
        
        // Dimensions & Weight (O-R)
        height: row[14] ? parseFloat(row[14]) : undefined,  // Column O
        width: row[15] ? parseFloat(row[15]) : undefined,   // Column P
        length: row[16] ? parseFloat(row[16]) : undefined,  // Column Q
        weight: row[17] ? parseFloat(row[17]) : undefined,  // Column R
        
        // Codes & Origin (S-U)
        midCode: row[18]?.trim() || undefined,       // Column S
        hsCode: row[19]?.trim() || undefined,        // Column T
        originCountry: row[20]?.trim() || undefined, // Column U
        
        // Tags & EAN (V-W)
        tags: tags.length > 0 ? tags : undefined,
        ean: row[22]?.trim() || undefined,  // Column W
        
        // Handle (X)
        handle: handle,
        handleWasGenerated: !existingHandle,
      }
    })
    .filter((p: SheetProduct | null): p is SheetProduct => p !== null && p.sku !== "")
}

function initR2Client(): S3Client {
  if (!CONFIG.R2_ENDPOINT || !CONFIG.R2_ACCESS_KEY || !CONFIG.R2_SECRET_KEY) {
    throw new Error("R2/S3 configuration missing. Check S3_* env vars.")
  }
  
  return new S3Client({
    region: "auto",
    endpoint: CONFIG.R2_ENDPOINT,
    credentials: {
      accessKeyId: CONFIG.R2_ACCESS_KEY,
      secretAccessKey: CONFIG.R2_SECRET_KEY,
    },
  })
}

interface UploadResult {
  thumbnailUrl: string | null
  imageUrls: string[]
  sourceUrls?: string[]     // Original source URLs from sheet (for change detection)
  keepExisting?: boolean    // True if images unchanged, don't clear existing
}

async function uploadProductImages(
  r2Client: S3Client,
  product: SheetProduct,
  logger: any
): Promise<UploadResult> {
  const result: UploadResult = {
    thumbnailUrl: null,
    imageUrls: [],
  }
  
  // Helper function to upload a single image
  const uploadImage = async (imageUrl: string, label: string, key: string): Promise<string | null> => {
    try {
      const isDriveUrl = imageUrl.includes("drive.google.com") || imageUrl.includes("docs.google.com")
      
      let imageBuffer: Buffer
      let contentType = "image/jpeg"
      
      if (isDriveUrl) {
        const fileId = extractDriveFileId(imageUrl)
        if (!fileId) {
          logger.warn(`   ⚠️ Invalid Google Drive URL format for ${label}: ${imageUrl}`)
          return null
        }
        
        const downloadUrl = convertToGoogleDriveDownloadUrl(imageUrl)
        logger.info(`   🔗 Google Drive URL for ${label}`)
        logger.info(`      Original: ${imageUrl.substring(0, 60)}...`)
        logger.info(`      Download: ${downloadUrl}`)
        
        imageBuffer = await downloadFromDrive(fileId)
        
        if (imageBuffer.length < 100) {
          logger.warn(`   ⚠️ ${label} download returned very small file (${imageBuffer.length} bytes)`)
          return null
        }
        
        const firstBytes = imageBuffer.slice(0, 50).toString('utf8').toLowerCase()
        if (firstBytes.includes('<!doctype') || firstBytes.includes('<html')) {
          logger.warn(`   ⚠️ ${label} download returned HTML - image not publicly shared`)
          return null
        }
        
      } else {
        logger.info(`   🔗 Direct URL for ${label}: ${imageUrl.substring(0, 60)}...`)
        imageBuffer = await downloadFromUrl(imageUrl)
        
        if (imageUrl.includes(".png")) contentType = "image/png"
        else if (imageUrl.includes(".webp")) contentType = "image/webp"
        else if (imageUrl.includes(".gif")) contentType = "image/gif"
      }
      
      await r2Client.send(
        new PutObjectCommand({
          Bucket: CONFIG.R2_BUCKET,
          Key: key,
          Body: imageBuffer,
          ContentType: contentType,
        })
      )
      
      const publicUrl = `${CONFIG.R2_PUBLIC_URL}/${key}`
      logger.info(`   📷 Uploaded ${label}: ${key} (${Math.round(imageBuffer.length / 1024)}KB)`)
      return publicUrl
      
    } catch (error: any) {
      logger.warn(`   ⚠️ Failed to upload ${label}: ${error.message}`)
      return null
    }
  }
  
  // Upload thumbnail (Column G)
  if (product.thumbnailUrl) {
    const thumbnailKey = `products/${product.handle}/${product.sku}-thumbnail.jpg`
    result.thumbnailUrl = await uploadImage(product.thumbnailUrl, "thumbnail", thumbnailKey)
  }
  
  // Upload additional images (Columns H, I, J)
  const additionalImages = [
    product.imageUrl2,
    product.imageUrl3,
    product.imageUrl4,
  ].filter((url): url is string => !!url && url.length > 0)
  
  for (let i = 0; i < additionalImages.length; i++) {
    const imageKey = `products/${product.handle}/${product.sku}-image-${i + 1}.jpg`
    const url = await uploadImage(additionalImages[i], `image ${i + 1}`, imageKey)
    if (url) {
      result.imageUrls.push(url)
    }
  }
  
  return result
}

/**
 * Cleans up old timestamped images from R2.
 * Old format: products/handle/SKU-1-1764953398909.jpg (with timestamp)
 * New format: products/handle/SKU-1.jpg (without timestamp)
 */
async function cleanupOldImages(
  r2Client: S3Client,
  logger: any
): Promise<number> {
  let deletedCount = 0
  
  try {
    logger.info("🧹 Scanning for old timestamped images to clean up...")
    
    // List all objects in the products/ prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: CONFIG.R2_BUCKET,
      Prefix: "products/",
    })
    
    const response = await r2Client.send(listCommand)
    
    if (!response.Contents || response.Contents.length === 0) {
      logger.info("   No images found in R2")
      return 0
    }
    
    // Find old timestamped images (pattern: SKU-N-TIMESTAMP.jpg where TIMESTAMP is 13+ digits)
    const oldImages = response.Contents.filter((obj) => {
      if (!obj.Key) return false
      // Match pattern like: products/handle/SKU-1-1764953398909.jpg
      // The timestamp is typically 13 digits (milliseconds since epoch)
      return /\/[^/]+-\d+-\d{10,}\.jpg$/.test(obj.Key)
    })
    
    if (oldImages.length === 0) {
      logger.info("   No old timestamped images found")
      return 0
    }
    
    logger.info(`   Found ${oldImages.length} old timestamped images to delete`)
    
    // Delete in batches of 1000 (S3 limit)
    const batchSize = 1000
    for (let i = 0; i < oldImages.length; i += batchSize) {
      const batch = oldImages.slice(i, i + batchSize)
      
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: CONFIG.R2_BUCKET,
        Delete: {
          Objects: batch.map((obj) => ({ Key: obj.Key })),
        },
      })
      
      await r2Client.send(deleteCommand)
      deletedCount += batch.length
      
      // Log some examples of what we're deleting
      if (i === 0) {
        const examples = batch.slice(0, 3).map((obj) => obj.Key)
        examples.forEach((key) => logger.info(`   🗑️ Deleted: ${key}`))
        if (batch.length > 3) {
          logger.info(`   ... and ${batch.length - 3} more`)
        }
      }
    }
    
    logger.info(`   ✅ Cleaned up ${deletedCount} old images`)
    
  } catch (error: any) {
    logger.warn(`   ⚠️ Cleanup failed: ${error.message}`)
  }
  
  return deletedCount
}

function extractDriveFileId(url: string): string | null {
  // Handle various Google Drive URL formats:
  // - https://drive.google.com/file/d/FILE_ID/view
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://drive.google.com/uc?export=download&id=FILE_ID
  // - https://docs.google.com/uc?id=FILE_ID
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,           // /file/d/FILE_ID/...
    /[?&]id=([a-zA-Z0-9_-]+)/,               // ?id=FILE_ID or &id=FILE_ID
    /\/d\/([a-zA-Z0-9_-]+)/,                  // /d/FILE_ID
    /open\?id=([a-zA-Z0-9_-]+)/,             // open?id=FILE_ID
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

/**
 * Converts any Google Drive URL to the direct download format.
 * This is crucial because only the download URL works for programmatic access.
 * 
 * Input formats (all are converted):
 *   - https://drive.google.com/file/d/FILE_ID/view
 *   - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   - https://drive.google.com/open?id=FILE_ID
 *   
 * Output format:
 *   - https://drive.google.com/uc?export=download&id=FILE_ID
 */
function convertToGoogleDriveDownloadUrl(url: string): string | null {
  const fileId = extractDriveFileId(url)
  if (!fileId) return null
  
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

async function downloadFromDrive(fileId: string): Promise<Buffer> {
  // Use the direct download URL format
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
  
  try {
    const buffer = await downloadFromUrl(downloadUrl)
    
    // Check if we got HTML instead of an image (virus scan warning page)
    // This happens for larger files that Google thinks might be suspicious
    const firstBytes = buffer.slice(0, 100).toString('utf8')
    if (firstBytes.includes('<!DOCTYPE') || firstBytes.includes('<html')) {
      // Try the alternative download URL that bypasses the warning
      const confirmUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`
      return downloadFromUrl(confirmUrl)
    }
    
    return buffer
  } catch (error: any) {
    // If first attempt fails, try with confirm parameter
    const confirmUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`
    return downloadFromUrl(confirmUrl)
  }
}

async function downloadFromUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFromUrl(redirectUrl).then(resolve).catch(reject)
          return
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }
      
      const chunks: Buffer[] = []
      response.on("data", (chunk) => chunks.push(chunk))
      response.on("end", () => resolve(Buffer.concat(chunks)))
      response.on("error", reject)
    })
    
    request.on("error", reject)
    request.setTimeout(30000, () => {
      request.destroy()
      reject(new Error("Download timeout"))
    })
  })
}

function detectChanges(
  existing: any,
  sheet: SheetProduct,
  uploadResult: UploadResult,
  logger: any
): Record<string, any> {
  const changes: Record<string, any> = {}
  const sku = sheet.sku
  
  // === PRODUCT LEVEL FIELDS (MANDATORY - warn if empty) ===
  
  // Title - MANDATORY
  if (sheet.title) {
    changes.title = sheet.title
  } else {
    logger.warn(`   ⚠️ [${sku}] Title is empty - keeping existing value`)
  }
  
  // Subtitle - MANDATORY
  if (sheet.subtitle) {
    changes.subtitle = sheet.subtitle
  } else {
    logger.warn(`   ⚠️ [${sku}] Subtitle is empty - keeping existing value`)
  }
  
  // Description - MANDATORY
  if (sheet.description) {
    changes.description = sheet.description
  } else {
    logger.warn(`   ⚠️ [${sku}] Description is empty - keeping existing value`)
  }
  
  // Handle images - Thumbnail is MANDATORY, additional images are OPTIONAL
  if (uploadResult.keepExisting) {
    // Images haven't changed, flag to skip clearing
    changes._keepExistingImages = true
  } else if (uploadResult.thumbnailUrl) {
    // Images changed - update thumbnail and images
    changes.thumbnail = uploadResult.thumbnailUrl
  
    // Combine thumbnail + additional images for the images array
    const allImageUrls = [
      uploadResult.thumbnailUrl,
      ...uploadResult.imageUrls,
    ]
    if (allImageUrls.length > 0) {
      changes.images = allImageUrls.map((url) => ({ url }))
    }
    
    // Store source URLs in metadata for future change detection
    if (uploadResult.sourceUrls && uploadResult.sourceUrls.length > 0) {
      changes.metadata = {
        ...(changes.metadata || {}),
        source_image_urls: uploadResult.sourceUrls,
      }
    }
  } else if (!existing.thumbnail) {
    // No thumbnail in sheet and no existing thumbnail - MANDATORY warning
    logger.warn(`   ⚠️ [${sku}] Thumbnail is empty - product needs a thumbnail image`)
  }
  
  // === VARIANT LEVEL FIELDS ===
  
  // Build variant update object with all fields
  const variantUpdate: Record<string, any> = {
    id: existing.variants[0].id,
  }
  
  // Variant title should match product title
  if (sheet.title) {
    variantUpdate.title = sheet.title
  }
  
  // Price - MANDATORY
  const newPrice = Math.round(sheet.price) // Price already in cents from sheet
  if (newPrice > 0) {
    variantUpdate.prices = [{ amount: newPrice, currency_code: "eur" }]
  } else {
    logger.warn(`   ⚠️ [${sku}] Price is empty or zero - keeping existing value`)
  }
  
  // === MANDATORY VARIANT FIELDS (warn if empty) ===
  
  // Dimensions (in mm) - MANDATORY
  if (sheet.height !== undefined && sheet.height !== null) {
    variantUpdate.height = sheet.height
  } else {
    logger.warn(`   ⚠️ [${sku}] Height is empty - keeping existing value`)
  }
  
  if (sheet.width !== undefined && sheet.width !== null) {
    variantUpdate.width = sheet.width
  } else {
    logger.warn(`   ⚠️ [${sku}] Width is empty - keeping existing value`)
  }
  
  if (sheet.length !== undefined && sheet.length !== null) {
    variantUpdate.length = sheet.length
  } else {
    logger.warn(`   ⚠️ [${sku}] Length is empty - keeping existing value`)
  }
  
  // Weight (in grams) - MANDATORY
  if (sheet.weight !== undefined && sheet.weight !== null) {
    variantUpdate.weight = sheet.weight
  } else {
    logger.warn(`   ⚠️ [${sku}] Weight is empty - keeping existing value`)
  }
  
  // HS code - MANDATORY
  if (sheet.hsCode) {
    variantUpdate.hs_code = sheet.hsCode
  } else {
    logger.warn(`   ⚠️ [${sku}] HS Code is empty - keeping existing value`)
  }
  
  // Origin country - MANDATORY
  if (sheet.originCountry) {
    variantUpdate.origin_country = sheet.originCountry
  } else {
    logger.warn(`   ⚠️ [${sku}] Origin Country is empty - keeping existing value`)
  }
  
  // === OPTIONAL VARIANT FIELDS (clear if empty) ===
  
  // MID code - OPTIONAL (clear if empty)
  const existingMidCode = existing.variants[0]?.mid_code
  if (sheet.midCode) {
    variantUpdate.mid_code = sheet.midCode
  } else if (existingMidCode) {
    variantUpdate.mid_code = null // Use null to clear
    logger.info(`   🧹 [${sku}] Clearing MID Code (was: "${existingMidCode}")`)
  }
  
  // EAN barcode - OPTIONAL (clear if empty)
  const existingEan = existing.variants[0]?.ean
  if (sheet.ean) {
    variantUpdate.ean = sheet.ean
  } else if (existingEan) {
    variantUpdate.ean = null
    logger.info(`   🧹 [${sku}] Clearing EAN`)
  }
  
  // Only add variants to changes if we have updates beyond just the ID
  if (Object.keys(variantUpdate).length > 1) {
    changes.variants = [variantUpdate]
  }
  
  // === OPTIONAL RELATIONAL FIELDS (clear if empty) ===
  
  // Category - OPTIONAL (clear if empty, set if provided)
  if (sheet.category) {
    changes._category = sheet.category
  } else {
    changes._clearCategory = true // Flag to clear category
  }
  
  // Collection - OPTIONAL (clear if empty, set if provided)
  if (sheet.collection) {
    changes._collection = sheet.collection
  } else {
    changes._clearCollection = true // Flag to clear collection
  }
  
  // Tags - OPTIONAL (clear if empty, set if provided)
  if (sheet.tags && sheet.tags.length > 0) {
    changes._tags = sheet.tags
  } else {
    changes._clearTags = true // Flag to clear tags
  }
  
  return changes
}

async function updateInventoryLevels(
  container: any,
  updates: { 
    sku: string
    quantity: number
    title: string
    location?: string
    height?: number
    width?: number
    length?: number
    weight?: number
    hsCode?: string
    originCountry?: string
    midCode?: string
  }[],
  stockLocations: any[],
  logger: any
) {
  const inventoryService = container.resolve(Modules.INVENTORY)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const productService = container.resolve(Modules.PRODUCT)
  
  // Build location lookup map (by name, case-insensitive)
  const locationByName = new Map<string, any>()
  for (const loc of stockLocations) {
    locationByName.set(loc.name.toLowerCase(), loc)
  }
  
  // Default location (first one) - only used when NO location specified
  const defaultLocation = stockLocations[0]
  
  for (const update of updates) {
    try {
      // Find the target location - FAIL if specified location not found (no silent fallback!)
      let targetLocation: any = null
      
      if (update.location) {
        // Location specified in sheet - must exist or we skip this update
        const foundLocation = locationByName.get(update.location.toLowerCase())
        if (foundLocation) {
          targetLocation = foundLocation
        } else {
          // FAIL - location specified but not found (likely a typo)
          logger.error(`   ❌ Location NOT FOUND: "${update.location}" for SKU: ${update.sku}`)
          logger.error(`      Available locations: ${stockLocations.map((l: any) => l.name).join(", ")}`)
          logger.error(`      ⚠️ Skipping inventory update to prevent ghost inventory!`)
          continue // Skip this update - don't use default
        }
      } else {
        // No location specified in sheet - use default
        targetLocation = defaultLocation
        if (targetLocation) {
          logger.info(`   📍 No location specified, using default: "${targetLocation.name}"`)
        }
      }
      
      if (!targetLocation) {
        logger.warn(`   ⚠️ No stock location available for SKU: ${update.sku}`)
        continue
      }
      
      const locationId = targetLocation.id
      const locationName = targetLocation.name
      
      // First, find the variant by SKU
      const variants = await productService.listProductVariants({
        sku: update.sku,
      })
      
      if (!variants.length) {
        logger.warn(`   ⚠️ Variant not found for SKU: ${update.sku}`)
        continue
      }
      
      const variant = variants[0]
      const variantId = variant.id
      logger.info(`   🔍 Found variant ${variantId} for SKU: ${update.sku}`)
      
      // Try to find inventory item - first by SKU directly
      let inventoryItemId: string | undefined
      
      // Method 1: Try to list inventory items by SKU
      const inventoryItemsBySku = await inventoryService.listInventoryItems({
        sku: update.sku,
      })
      
      if (inventoryItemsBySku.length > 0) {
        inventoryItemId = inventoryItemsBySku[0].id
        logger.info(`   🔍 Found inventory item by SKU: ${inventoryItemId}`)
      } else {
        // Method 2: Try to get inventory item via the link
        try {
          const links = await remoteLink.list({
            product_variant_id: variantId,
          })
          
          logger.info(`   🔍 Found ${links?.length || 0} links for variant`)
          
          if (links && links.length > 0) {
            // Look for inventory item link
            for (const link of links) {
              if (link.inventory_item_id) {
                inventoryItemId = link.inventory_item_id
                logger.info(`   🔍 Found inventory item via link: ${inventoryItemId}`)
                break
              }
            }
          }
        } catch (linkError: any) {
          logger.warn(`   ⚠️ Could not query links: ${linkError.message}`)
        }
      }
      
      if (!inventoryItemId) {
        logger.warn(`   ⚠️ No inventory item found for SKU: ${update.sku}`)
        logger.warn(`      Variant ${variantId} may not have manage_inventory enabled`)
        continue
      }
      
      // Update inventory item with title and dimensions
      try {
        const [inventoryItem] = await inventoryService.listInventoryItems({
          id: inventoryItemId,
        })
        
        // Build update data for inventory item
        const inventoryItemUpdate: Record<string, any> = {
          id: inventoryItemId,
        }
        
        // Title
        if (update.title && inventoryItem?.title !== update.title) {
          inventoryItemUpdate.title = update.title
        }
        
        // Dimensions and weight - these are stored on inventory item in Medusa v2
        if (update.height !== undefined) inventoryItemUpdate.height = update.height
        if (update.width !== undefined) inventoryItemUpdate.width = update.width
        if (update.length !== undefined) inventoryItemUpdate.length = update.length
        if (update.weight !== undefined) inventoryItemUpdate.weight = update.weight
        
        // Codes
        if (update.hsCode) inventoryItemUpdate.hs_code = update.hsCode
        if (update.originCountry) inventoryItemUpdate.origin_country = update.originCountry
        if (update.midCode) inventoryItemUpdate.mid_code = update.midCode
        
        // Only update if there are changes
        if (Object.keys(inventoryItemUpdate).length > 1) {
          const fieldsToUpdate = Object.keys(inventoryItemUpdate).filter(k => k !== 'id')
          logger.info(`   📝 Updating inventory item: ${fieldsToUpdate.join(", ")}`)
          await inventoryService.updateInventoryItems([inventoryItemUpdate])
          logger.info(`   ✅ Updated inventory item attributes`)
        }
      } catch (titleError: any) {
        logger.warn(`   ⚠️ Could not update inventory item: ${titleError.message}`)
      }
      
      // Get current inventory level at this location
      const levels = await inventoryService.listInventoryLevels({
        inventory_item_id: inventoryItemId,
        location_id: locationId,
      })
      
      logger.info(`   🔍 Found ${levels.length} inventory levels at location "${locationName}"`)
      
      // Only update inventory quantity if there's a restock amount
      if (update.quantity > 0) {
      if (levels.length > 0) {
        // Update existing level (ADD to current quantity)
          const level = levels[0]
          const currentQty = level.stocked_quantity || 0
        const newQty = currentQty + update.quantity
        
          logger.info(`   🔍 Level details: id=${level.id}, item=${level.inventory_item_id}, loc=${level.location_id}, qty=${currentQty}`)
          
          // Use adjustInventory instead of updateInventoryLevels for delta updates
          await inventoryService.adjustInventory(
            inventoryItemId,
            locationId,
            update.quantity
          )
          
          logger.info(`   📦 ${update.sku} @ "${locationName}": ${currentQty} + ${update.quantity} = ${newQty}`)
      } else {
          // Create new inventory level at this location
          logger.info(`   📦 Creating inventory level for item ${inventoryItemId} at location ${locationId}`)
        await createInventoryLevelsWorkflow(container).run({
          input: {
            inventory_levels: [{
              inventory_item_id: inventoryItemId,
              location_id: locationId,
              stocked_quantity: update.quantity,
            }],
          },
        })
        
          logger.info(`   📦 ${update.sku} @ "${locationName}": Created with ${update.quantity} units`)
        }
      } else {
        logger.info(`   ⏭️ No quantity to add, just updated attributes`)
      }
      
    } catch (error: any) {
      logger.error(`   ❌ Inventory update failed for ${update.sku}: ${error.message}`)
      logger.error(`      Stack: ${error.stack?.split('\n')[0]}`)
    }
  }
}

/**
 * Sync inventory item titles to match product titles for all products
 */
async function syncInventoryItemTitles(
  container: any,
  products: SheetProduct[],
  logger: any
) {
  const inventoryService = container.resolve(Modules.INVENTORY)
  let updatedCount = 0
  
  for (const product of products) {
    try {
      // Find inventory item by SKU
      const inventoryItems = await inventoryService.listInventoryItems({
        sku: product.sku,
      })
      
      if (!inventoryItems.length) continue
      
      const inventoryItem = inventoryItems[0]
      
      // Update title if different
      if (inventoryItem.title !== product.title) {
        await inventoryService.updateInventoryItems([{
          id: inventoryItem.id,
          title: product.title,
        }])
        updatedCount++
      }
    } catch (error: any) {
      // Silently skip errors for individual items
    }
  }
  
  if (updatedCount > 0) {
    logger.info(`   ✅ Updated ${updatedCount} inventory item titles`)
  } else {
    logger.info(`   ⏭️ All inventory item titles already in sync`)
  }
}

async function updateSheetSyncStatus(
  sheets: any,
  products: SheetProduct[],
  logger: any
) {
  // Update columns after sync:
  // - Column G: Clear Restock Qty to 0
  // - Column X: Write auto-generated Handle
  // - Column Y: Update Last Synced timestamp
  const now = new Date().toISOString().replace("T", " ").substring(0, 19)
  
  const updates: any[] = []
  
  for (const p of products) {
    // Clear Restock Qty (column G) if it had a value
    if (p.restockQty > 0) {
      updates.push({
        range: `${CONFIG.SHEET_TAB}!G${p.row}`,
        values: [[0]],
      })
    }
    
    // Write Handle (column X) if it was auto-generated
    if (p.handleWasGenerated) {
      updates.push({
        range: `${CONFIG.SHEET_TAB}!X${p.row}`,
        values: [[p.handle]],
      })
    }
    
    // Update Last Synced (column Y)
    updates.push({
      range: `${CONFIG.SHEET_TAB}!Y${p.row}`,
      values: [[now]],
    })
  }
  
  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates,
      },
    })
    
    const restockCleared = products.filter(p => p.restockQty > 0).length
    const handlesGenerated = products.filter(p => p.handleWasGenerated).length
    logger.info(`\n📝 Updated sheet:`)
    logger.info(`   - Cleared ${restockCleared} restock quantities`)
    logger.info(`   - Generated ${handlesGenerated} handles`)
    logger.info(`   - Updated ${products.length} sync timestamps`)
  }
}

