import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // ChromaDB and related packages should only run on server-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Externalize problematic packages for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('cohere-ai', 'chromadb');
    }

    return config;
  },
};

export default nextConfig;
