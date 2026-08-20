import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'export',
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  transpilePackages: ['@danvic/ui', '@danvic/api-client'],
  env: {
    NEXT_PUBLIC_DANVIC_APP: 'student',
  },
  turbopack: {
    resolveAlias: {
      'agora-foundation/lib/logger': './src/lib/agora-foundation-empty.ts',
      'agora-foundation/lib/logger/common': './src/lib/agora-foundation-empty.ts',
      'agora-foundation/package.json': './src/lib/agora-foundation-empty.ts',
    },
  },
}

export default config
