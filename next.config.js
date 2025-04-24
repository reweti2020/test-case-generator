/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable experimental features for App Router
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ["cheerio", "axios"],
  },
  // Configure redirects if needed
  async redirects() {
    return []
  },
  // Configure headers if needed
  async headers() {
    return []
  },
  // Disable image optimization if not needed
  images: {
    unoptimized: true,
    domains: [],
  },
  // Configure webpack if needed
  webpack(config) {
    return config
  },
}

module.exports = nextConfig
