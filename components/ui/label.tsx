"use client"

import * as React from "react"

import { cn } from "@/shared/utils"

/**
 * Label primitive สำหรับ form accessibility
 *
 * ใช้คู่กับ input/select/checkbox หลายหน้า ถ้าแก้ style ต้องเช็ก disabled state
 * เพราะ form บางส่วนถูก lock ตาม role เช่น viewer read-only.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
