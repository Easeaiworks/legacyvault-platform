import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Monorepo awareness for Vercel — trace files from the repo root so
  // @legacyvault/database and @legacyvault/shared resolve correctly.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Prisma ships platform-specific native binaries — mark them external so
  // Next.js doesn't try to bundle them into the server function.
  serverExternalPackages: ['@prisma/client', 'prisma', 'pdfkit'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/photos/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  transpilePackages: ['@legacyvault/shared', '@legacyvault/database'],
};

export default nextConfig;
