import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Configure modules
const modules: any[] = []

// Configure Redis event bus and cache if Redis URL is provided
if (process.env.REDIS_URL) {
  modules.push(
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    }
  )
}

// Only configure S3 file provider if credentials are provided
if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
  modules.push({
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        {
          resolve: "@medusajs/file-s3",
          id: "s3",
          options: {
            file_url: process.env.S3_FILE_URL,
            access_key_id: process.env.S3_ACCESS_KEY_ID,
            secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
            region: process.env.S3_REGION,
            bucket: process.env.S3_BUCKET,
            endpoint: process.env.S3_ENDPOINT,
          },
        },
      ],
    },
  })
}

// Configure fulfillment module with manual provider
modules.push({
  resolve: "@medusajs/medusa/fulfillment",
  options: {
    providers: [
      {
        resolve: "@medusajs/medusa/fulfillment-manual",
        id: "manual",
      },
    ],
  },
})

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    // When deploying admin separately on Vercel, set the backend URL
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    // Use "/" path for standalone Vercel deployment, "/app" for integrated deployment
    path: (process.env.ADMIN_PATH || "/") as `/${string}`,
    // Set to true for Railway backend-only deployment, false when building for Vercel admin
    disable: process.env.DISABLE_ADMIN === "true",
  },
  modules,
})
