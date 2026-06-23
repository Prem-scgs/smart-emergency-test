/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['172.20.10.4'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/emergency-api/:path*',
        destination: 'http://127.0.0.1:4000/:path*',
      },
    ]
  },
}

export default nextConfig
