# SMS Location Share Design

## Goal

เปลี่ยนช่องทางแชร์ตำแหน่งใน Mobile จาก Telegram เป็น SMS เพื่อให้ผู้ใช้ทั่วไปเปิดแอปข้อความของเครื่องและส่งตำแหน่งฉุกเฉินได้ทันที

## Scope

- รับ GPS และชื่อพื้นที่จาก `MobileApp` ชุดเดิม
- คง LINE และ WhatsApp ไว้
- แทน Telegram ด้วยปุ่ม SMS
- เปิด deep link `sms:?body=...` โดยมีข้อความภาษาไทย, พื้นที่, พิกัดหกตำแหน่ง และลิงก์ Google Maps
- ผู้ใช้เลือกผู้รับและกดส่งเองในแอปข้อความ

## Non-goals

- ไม่ส่ง SMS อัตโนมัติ
- ไม่เพิ่ม backend, database, dependency หรือ permission ใหม่
- ไม่แก้ flow การแจ้งเหตุหรือการโทร

## Data Flow

`MobileApp.currentLocation` ส่งให้ `LocationSharingScreen` แล้ว helper กลางสร้าง Google Maps URL และข้อความ SMS จากข้อมูลเดียวกัน ปุ่ม SMS เปิด native composer ผ่าน `window.location.href` เพื่อให้ทำงานใน mobile browser/webview ได้ตรงเจตนา

## Error Handling

หาก browser ไม่รองรับ SMS URI ระบบจะไม่อ้างว่าส่งสำเร็จ ผู้ใช้ยังคัดลอกพิกัดหรือเปิด Google Maps ได้ตามเดิม

## Acceptance Criteria

1. หน้าแชร์มี LINE, SMS และ WhatsApp เท่านั้น
2. SMS body มีพื้นที่เมื่อมีข้อมูล, พิกัดหกตำแหน่ง และ Google Maps URL
3. ไม่มีชื่อ/URL Telegram ใน runtime code ที่เกี่ยวข้องกับการแชร์ตำแหน่ง
4. tests และ build ผ่านก่อนเสนอ commit
