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
    serverComponentsExternalPackages: ["cheerio", "axios"],
  },
  // Configure output to be compatible with Vercel
  output: "standalone",
}

module.exports = nextConfig

