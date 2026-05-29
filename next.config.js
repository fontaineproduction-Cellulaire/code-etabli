/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
          serverComponentsExternalPackages: ['pdf-parse', '@prisma/client'],
    },
    webpack: (config) => {
          config.resolve.alias.canvas = false
          return config
    },
}

module.exports = nextConfig
