/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx'],
  // Point Next.js to the correct pages directory
  experimental: {
    appDir: false,
  },
}

module.exports = nextConfig
