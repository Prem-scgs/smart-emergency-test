/** @type {import('next').NextConfig} */
function getEmergencyApiInternalUrl() {
  const externalUrl =
    process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL ??
    process.env.NEXT_PUBLIC_EMERGENCY_API_URL
  const internalUrl = process.env.EMERGENCY_API_INTERNAL_URL

  return (
    process.env.VERCEL
      ? (externalUrl ?? internalUrl ?? 'http://127.0.0.1:4000')
      : (internalUrl ?? externalUrl ?? 'http://127.0.0.1:4000')
  ).replace(/\/$/, '')
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
