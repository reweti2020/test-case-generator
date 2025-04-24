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
  images: {
    unoptimized: true,
  },
  // Updated experimental features for Next.js 14
  experimental: {
    // appDir is now the default in Next.js 14, so we don't need to specify it
    serverComponentsExternalPackages: ["cheerio", "axios"],
  },
  // Configure webpack if needed
  webpack(config) {
    return config
  },
}

module.exports = nextConfig
