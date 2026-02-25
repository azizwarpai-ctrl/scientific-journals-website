/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    // turbo was invalid here
  },
  // As per invalid config warning tip:
  turbopack: {
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
