/** @type {import('next').NextConfig} */
const nextConfig = {
      experimental: {
              serverComponentsExternalPackages: ['pdf-parse', '@prisma/client'],
      },
      webpack: (config) => {
              config.resolve.alias.canvas = false
              return config
      },
      // Augmenter la limite de taille pour les uploads de gros PDFs (ex: CCQ 14.8Mo)
      serverRuntimeConfig: {
              bodyParser: {
                        sizeLimit: '50mb',
              },
      },
}

module.exports = nextConfig
