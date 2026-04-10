/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'submitmanager.com',
      },
    ],
  },
  experimental: {
    // turbo was invalid here
  },
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime'],
  // As per invalid config warning tip:
  turbopack: {
    // rules for .wasm are handled by transpilePackages or need correct syntax if still failing
  },
  webpack: (config, { dev, isServer }) => {
    // Suppress source map warnings in development
    if (dev && !isServer) {
      config.devtool = 'cheap-module-source-map'
    }
    return config
  },
}

export default nextConfig
