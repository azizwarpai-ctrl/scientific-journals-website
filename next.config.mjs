/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
