/** @type {import('next').NextConfig} */
const nextConfig = {
  // SEO: pin URL canonicalization so buildCanonical / sitemap / robots all
  // agree with what Next.js actually serves. trailingSlash=false matches
  // src/lib/seo/canonical.ts which strips trailing slashes, and resolves
  // the GSC "duplicate, user didn't select canonical" warning.
  trailingSlash: false,
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
