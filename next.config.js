/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx'],
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['pages', 'components', 'lib'],
    // Don't fail the build on ESLint warnings, only errors
    ignoreDuringBuilds: false,
  },
  generateBuildId: async () => {
    // Use timestamp to force cache invalidation on every build
    return `build-${Date.now()}`;
  },
  poweredByHeader: false,
}

module.exports = nextConfig
