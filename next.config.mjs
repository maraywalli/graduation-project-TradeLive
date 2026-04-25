/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    '*.replit.dev',
    '*.repl.co',
    '*.replit.app',
    'localhost',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Server Actions are stable in Next 15 — only the allowed-origins list is
  // still configured under `experimental` for now.
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NODE_ENV === 'production'
        ? [process.env.VERCEL_URL, process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean)
        : ['*'],
    },
  },
  // Turbopack-specific config (dev). Quiets the
  // "Webpack is configured while Turbopack is not" warning.
  turbopack: {
    rules: {},
  },
  // Webpack config still applies to the production build (`next build`),
  // which uses webpack — not turbopack.
  webpack: (config, { dev }) => {
    config.output = { ...(config.output || {}), chunkLoadTimeout: 120000 };
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          '**/.git/**',
          '**/node_modules/**',
          '**/.next/**',
          '**/.local/**',
          '**/.cache/**',
          '**/.config/**',
          '**/.agents/**',
          '**/tsconfig.tsbuildinfo',
        ],
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Allow embedding in Replit preview & deployed iframes.
          // X-Frame-Options has no "ALLOWALL" — use CSP frame-ancestors instead.
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://*.replit.dev https://*.replit.app https://*.repl.co https://*.vercel.app" },
          // Allow geolocation so sellers can pin items on the map.
          { key: 'Permissions-Policy', value: 'geolocation=*' },
        ],
      },
    ];
  },
};

export default nextConfig;
