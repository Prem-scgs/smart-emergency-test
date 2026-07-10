# Plans and Specs Index

โฟลเดอร์นี้เก็บแผนเก่าและ design notes เพื่อเป็นบริบททางประวัติศาสตร์ ไม่ใช่ current implementation contract เสมอไป

ถ้าต้องดูสถานะปัจจุบัน ให้เริ่มจาก:

- [ARCHITECTURE_OVERVIEW.md](../architecture/ARCHITECTURE_OVERVIEW.md)
- [API_CONTRACT.md](../api/API_CONTRACT.md)
- [RUNBOOK.md](../operations/RUNBOOK.md)
- [FSD_LITE_GUIDE.md](../architecture/FSD_LITE_GUIDE.md)

## Current Rule

- ไฟล์ใน `docs/plans` และ `docs/specs` อาจอ้าง path เก่า เช่น `components/admin`, `components/mobile`, หรือ `lib/use-sse`
- path เหล่านั้นถูก refactor แล้ว ให้ดู `FSD_LITE_GUIDE.md` สำหรับ owner ปัจจุบัน
- endpoint ที่อยู่ใน historical plan/spec แต่ไม่มีใน `API_CONTRACT.md` ไม่ถือเป็น current API contract

## Historical Plans

- `2026-06-18-incident-status-tracking.md`: implemented/superseded บางส่วน ใช้เป็นบริบทของ incident tracking, status history, SSE และ case tracking
- `2026-06-19-mobile-status-realtime-sync.md`: historical context ของ mobile tracking realtime
- `2026-06-19-status-cors-mobile-feedback-fix.md`: historical context ของ CORS/mobile feedback
- `2026-06-20-admin-close-and-rollback-status.md`: historical context ของ admin status close/rollback behavior
- `2026-06-21-mobile-network-api.md`: historical context ของ API URL/CORS fallback

## Related Specs

- `../specs/2026-06-18-incident-status-tracking-design.md`: approved historical design; endpoint examples เช่น `POST /api/incidents/:id/locations` ไม่ใช่ current contract เว้นแต่ `API_CONTRACT.md` จะระบุ
- `../specs/2026-06-21-sms-location-share-design.md`: historical design ของ SMS/location sharing ก่อน production sharing ย้ายมาอยู่ `features/location-sharing`

## Superpowers Plan

- `../superpowers/plans/2026-06-24-contacts-form-layout.md`: historical UI implementation plan สำหรับ contacts form layout

## How To Use These Files

ใช้เพื่อเข้าใจ “ทำไมระบบถึงเป็นแบบนี้” ไม่ใช่ใช้เป็น checklist งานค้างโดยตรง

ก่อน implement จาก historical plan ให้ตรวจ:

1. source ปัจจุบัน
2. `API_CONTRACT.md`
3. `FSD_LITE_GUIDE.md`
4. tests ที่ล็อก behavior ปัจจุบัน
