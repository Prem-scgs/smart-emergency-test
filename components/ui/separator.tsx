"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/shared/utils"

/**
 * Separator primitive สำหรับแบ่ง section ใน panel/card/menu
 *
 * เก็บ orientation และ spacing pattern ไว้กลางระบบ เพื่อให้ layout หน้า admin
 * ไม่ต้องสร้างเส้นคั่นเฉพาะหน้าเอง.
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
