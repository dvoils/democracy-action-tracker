import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: '/democracy-action-tracker',
  assetPrefix: '/democracy-action-tracker/',
  trailingSlash: true,
};

export default nextConfig;
