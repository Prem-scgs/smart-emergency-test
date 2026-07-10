/** @type {import('next').NextConfig} */
/**
 * เลือกปลายทาง API สำหรับ Next rewrite `/emergency-api/*`
 *
 * บน Vercel จะใช้ public/external URL ก่อน เพราะ frontend ต้องวิ่งผ่าน
 * Cloudflare tunnel หรือ domain API ที่ทีมตั้งไว้ ส่วน local จะใช้ internal URL
 * ก่อนเพื่อให้ Docker/เครื่อง dev คุยกับ API ได้ตรง ๆ.
 *
 * ถ้าแก้ส่วนนี้ต้องทดสอบ `/emergency-api/health`, admin health page และ SSE
 * เพราะทั้งหมดพึ่ง base URL ชุดเดียวกัน.
 */
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
  /**
   * ให้ frontend เรียก same-origin path แล้ว Next proxy ไป API
   * เพื่อลด CORS และให้ Vercel เปลี่ยน API tunnel ได้ผ่าน env.
   */
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
