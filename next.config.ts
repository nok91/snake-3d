import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three is ESM-only and ships untranspiled sources that Next must compile.
  transpilePackages: ['three'],
}

export default nextConfig
