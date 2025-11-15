const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/api': path.resolve(__dirname, 'src/api'),
      '@/components': path.resolve(__dirname, 'src/MessageHub/components'),
      '@/entities': path.resolve(__dirname, 'src/MessageHub/entities'),
    };
    return config;
  },
}

module.exports = nextConfig
