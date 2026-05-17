import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    domains: ['localhost', 'guineatender.ai'],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'GuineaTender AI',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
}

export default nextConfig
