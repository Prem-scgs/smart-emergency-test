/** @type {import('next').NextConfig} */
function getEmergencyApiInternalUrl() {
  return (process.env.EMERGENCY_API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '')
}

const nextConfig = {
  allowedDevOrigins: ['172.20.10.4'],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/emergency-api/:path*',
        destination: getEmergencyApiInternalUrl() + '/:path*',
      },
    ]
  },
}

export default nextConfig
