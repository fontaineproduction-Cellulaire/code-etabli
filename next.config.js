/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', '@prisma/client'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  // Vercel : augmenter la limite pour l'upload de PDF
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
}

module.exports = nextConfig
