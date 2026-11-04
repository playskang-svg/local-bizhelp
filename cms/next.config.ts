import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Metrics view imports ../shared/metrics.mjs, which lives outside cms/.
  turbopack: { root: path.resolve(import.meta.dirname, '..') },
  // next dev would otherwise write AGENTS.md and CLAUDE.md into the repo.
  agentRules: false,
  outputFileTracingExcludes: { '*': ['**/sharp/**', '**/@img/**'] },
  images: {
    unoptimized: true,
    localPatterns: [
      {
        pathname: '/cms-api/media/file/**',
      },
    ],
  },
  // Packages with Cloudflare Workers (workerd) specific code
  // Read more: https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],

  // Scoped to this site: the zone-wide "Always Use HTTPS" switch would also touch other bizhelp.kr subdomains.
  // OpenNext tests `value` unanchored, so ^http$ keeps it from matching "https"; `/:path*` leaves the root unsubstituted.
  redirects: async () => {
    const has = [
      { type: 'host' as const, value: 'local.bizhelp.kr' },
      { type: 'header' as const, key: 'x-forwarded-proto', value: '^http$' },
    ]
    return [
      { source: '/', has, destination: 'https://local.bizhelp.kr/', permanent: true },
      { source: '/:path+', has, destination: 'https://local.bizhelp.kr/:path+', permanent: true },
    ]
  },

  // Your Next.js config here
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
