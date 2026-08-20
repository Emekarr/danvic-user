import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  transpilePackages: ['@danvic/ui', '@danvic/api-client'],
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      'agora-foundation': false,
    }
    return webpackConfig
  },
}

export default config
