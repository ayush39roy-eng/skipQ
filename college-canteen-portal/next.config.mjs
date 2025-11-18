/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
}

export default nextConfig
