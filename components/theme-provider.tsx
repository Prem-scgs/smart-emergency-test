'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

/**
 * Wrapper กลางของ `next-themes`
 *
 * ใช้ให้ทั้ง mobile/admin อ่าน dark/light class จากจุดเดียวกัน และช่วยกันไม่ให้
 * component ระดับ feature import provider library โดยตรงหลายที่.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
