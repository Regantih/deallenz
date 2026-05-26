import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow production builds to succeed even if there are ESLint or TS errors.
  // Lint and type-check still run in dev and CI; we just don't block deploys.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // pdfjs-dist uses a canvas dep that doesn't exist in Node.js — stub it out
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  // pdf-parse and pdfjs-dist must not be bundled: they load worker .mjs files
  // dynamically at runtime via filesystem paths. Bundling breaks those paths.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // Vercel's file tracer can't follow dynamic worker imports, so we explicitly
  // include the full pdfjs-dist directory in the Lambda bundle.
  outputFileTracingIncludes: {
    '/api/upload': [
      './node_modules/pdf-parse/**/*',
      './node_modules/pdfjs-dist/**/*',
    ],
    '/api/try': [
      './node_modules/pdf-parse/**/*',
      './node_modules/pdfjs-dist/**/*',
    ],
  },
  // The legacy .html files in the repo root are served as static assets from /public
  // or via the existing GitHub Pages setup — Next.js routes are additive and do not
  // shadow those files.
  experimental: {
    serverActions: {
      // Update allowedOrigins at deploy time to include your Vercel domain.
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
