/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions are stable in Next 15; nothing extra needed here.
  },
};

module.exports = nextConfig;
