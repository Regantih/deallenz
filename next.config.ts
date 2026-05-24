import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
