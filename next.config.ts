import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
