/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    turboMode: false,
    outputFileTracingRoot: __dirname,
  },
  eslint: {
    // Désactiver ESLint pendant le build pour Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Désactiver la vérification TypeScript pendant le build pour Vercel
    ignoreBuildErrors: true,
  },
}

export default nextConfig
