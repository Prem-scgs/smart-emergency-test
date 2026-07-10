import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Thai, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const ibmPlexSansThai = IBM_Plex_Sans_Thai({ 
  variable: '--font-ibm-plex-sans-thai', 
  subsets: ['latin', 'thai'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Smart Emergency - Emergency Response Platform',
  description: 'Enterprise-grade emergency response application for citizens to quickly contact emergency services based on incident type and current location.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#D32F2F' },
    { media: '(prefers-color-scheme: dark)', color: '#EF5350' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

/**
 * Root layout ของทั้ง mobile และ admin
 *
 * Flow สำคัญ:
 * - ThemeProvider ครอบทุกหน้า เพราะ admin/mobile ใช้ class dark/light ร่วมกัน
 * - Toaster อยู่ระดับ root เพื่อให้ toast จาก widget/feature ใดก็แสดงได้
 * - Analytics เปิดเฉพาะ production เพื่อไม่ให้ local/test มี side effect เกินจำเป็น
 *
 * ถ้าแก้ provider stack ตรงนี้ต้อง smoke ทั้ง mobile create incident และ admin dashboard
 * เพราะทั้งสอง flow แชร์ font, theme และ toast host เดียวกัน.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html 
      lang="th" 
      className={`${ibmPlexSansThai.className} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
