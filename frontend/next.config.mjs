import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev', // Cloudflare R2 buckets
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app', // Railway hosted Medusa
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Fallback for demo images
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    esmExternals: true,
  },
  transpilePackages: ['@splinetool/react-spline'],
}

export default withNextIntl(nextConfig)
