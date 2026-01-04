# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build with production flag and increased memory
# DISABLE_ADMIN=true to skip admin build (admin deployed separately on Vercel)
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV DISABLE_ADMIN=true
RUN yarn build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy entire built application (ensures nothing is missed)
COPY --from=builder /app ./

# Set production environment
ENV NODE_ENV=production
ENV DISABLE_ADMIN=true

# Expose port (Railway expects 9000)
EXPOSE 9000

# Note: Railway handles health checks at the platform level
# No HEALTHCHECK needed in Dockerfile

# Admin is disabled via DISABLE_ADMIN=true - deployed separately on Vercel
# See vercel.json for admin deployment configuration

# Add node_modules/.bin to PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# Start command: migrate then start
CMD ["sh", "-c", "medusa db:migrate && medusa start"]

