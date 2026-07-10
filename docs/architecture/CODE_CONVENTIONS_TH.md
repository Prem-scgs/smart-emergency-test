# Code Conventions ภาษาไทย

เอกสารนี้เป็นกฎกลางสำหรับคนที่จะแก้โค้ด Smart Emergency ต่อ เป้าหมายคือให้โค้ดและเอกสารอ่านง่ายพอสำหรับ junior developer โดยไม่ทำให้ repo รกด้วย comment หรือไฟล์ที่ซ้ำกัน

อ่านคู่กับ:

- [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md): ภาพรวมระบบและ data flow
- [FSD_LITE_GUIDE.md](FSD_LITE_GUIDE.md): วางไฟล์ใหม่ไว้ layer ไหน
- [RUNBOOK.md](../operations/RUNBOOK.md): วิธีรันและ debug
- [API_CONTRACT.md](../api/API_CONTRACT.md): endpoint/role contract ปัจจุบัน

## หลักการสำคัญ

- ถ้าแก้ business logic, API, env, schema, realtime, GIS หรือ file ownership ต้องอัปเดต docs ที่เกี่ยวข้องใน commit เดียวกัน
- Comment ภาษาไทยใช้ได้และควรใช้เมื่อช่วยอธิบาย “เหตุผล/ผลกระทบ” ไม่ใช่แปล syntax
- ไฟล์ใหม่ต้องวางตาม FSD-lite ตั้งแต่ต้น: `widgets`, `features`, `entities`, `shared`, หรือ `app` shell
- `lib/` ตอนนี้เป็นพื้นที่ tests/wiring checks เท่านั้น ห้ามเพิ่ม runtime implementation ใหม่
- ห้าม commit secret, token, tunnel token, เบอร์จริง หรือข้อมูลส่วนตัว

## กฎ Comment

ควรใส่ comment เมื่อโค้ดมีเรื่องเหล่านี้:

- Business rule: role scope, agency filter, ownership check, status transition, rate limit
- Fallback: SSE หลุดแล้ว polling แทน, API URL fallback, copy/share fallback
- Realtime: event de-duplication, cursor polling, reconnect behavior
- GIS: point-in-polygon, fit bounds, GeoJSON `[lng, lat]` เทียบกับ DB `latitude/longitude`
- API/DB integration: transaction, migration compatibility, audit log, query ที่ join หลายตาราง
- Security boundary: demo auth header/localStorage ไม่ใช่ production auth

ไม่ควรใส่ comment เมื่อเป็น syntax ที่ชื่อโค้ดบอกอยู่แล้ว เช่น `setState`, `map`, `if`, `fetch` ธรรมดา

ตัวอย่าง comment ที่ดี:

```ts
// ใช้ cursor ตอน dashboard เริ่มทำงาน เพื่อไม่ replay incident เก่าจน alert ซ้ำตอนเปิดหน้าใหม่
const cursor = startedAtRef.current
```

```ts
// viewer ต้องเห็นข้อมูลสดแบบ passive แต่ห้ามได้ popup/sound/actionable notification
// ถ้าแก้กฎนี้ต้องทดสอบ notification provider, dashboard refresh และ detail read-only พร้อมกัน
const canShowAlert = canUserSeeAlert(alert, user)
```

## กฎ Docs

ต้องอัปเดต docs เมื่อมีการเปลี่ยน:

- Endpoint หรือ response shape: อัปเดต [API_CONTRACT.md](../api/API_CONTRACT.md) และ runbook ถ้าเกี่ยวกับ operations
- Environment variable: อัปเดต [ENVIRONMENT.md](../operations/ENVIRONMENT.md), `.env.example`, และ runbook ถ้าเกี่ยวกับ deploy
- Migration/schema: อัปเดต README/RUNBOOK/migration notes ที่เกี่ยวข้อง
- Realtime behavior: อัปเดต runbook และ API contract
- GIS/location behavior: อัปเดต architecture overview หรือ runbook
- โครงสร้างไฟล์/FSD owner: อัปเดต [FSD_LITE_GUIDE.md](FSD_LITE_GUIDE.md)

ถ้าเป็นเอกสารแผนเก่าใน `docs/plans` หรือ `docs/specs` ให้รักษาประวัติไว้ แต่ต้องบอกชัดว่าเป็น historical/spec-only ไม่ใช่ runtime contract ปัจจุบัน

## กฎ FSD-lite สำหรับไฟล์ใหม่

ก่อนสร้างไฟล์ใหม่ ให้ตอบให้ได้ว่าไฟล์นี้อยู่ชั้นไหน:

- `app/`: route, layout, page shell เท่านั้น
- `widgets/`: UI ก้อนใหญ่/หน้าใหญ่ที่ประกอบหลาย feature/entity
- `features/`: workflow/action ของผู้ใช้ เช่น alert, mobile incident, location sharing
- `entities/`: domain type/helper เช่น incident, contact, area, call
- `shared/`: API/config/auth/i18n/realtime/reference/utils ที่ใช้ข้าม domain
- `components/ui/`: primitive UI ที่ไม่มี business logic
- `lib/`: tests/wiring checks เท่านั้น

ถ้าไม่แน่ใจว่าไฟล์ควรอยู่ไหน ให้หยุดแล้วดู [FSD_LITE_GUIDE.md](FSD_LITE_GUIDE.md) ก่อน ไม่ควรสร้างไฟล์ “ชั่วคราว” ใน `lib/`

## Checklist ก่อน Commit

1. Tests/build ที่เกี่ยวข้องผ่านหรือยัง
2. Logic สำคัญมี comment อธิบายเหตุผล/ผลกระทบหรือยัง
3. Docs ที่เกี่ยวข้องถูกอัปเดตหรือยัง
4. ไฟล์ใหม่วางถูก FSD-lite layer หรือยัง
5. ไม่มี secret/เบอร์จริง/personal data หลุดเข้า repo ใช่ไหม
6. ถ้า deploy/Vercel/Cloudflare เกี่ยวข้อง ต้องเช็ก env และ smoke flow แล้วหรือยัง

## แนวทางสำหรับคนมาทำต่อ

- เริ่มจากอ่าน [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) เพื่อเห็นภาพรวมก่อน
- ถ้า debug runtime ให้ใช้ [RUNBOOK.md](../operations/RUNBOOK.md)
- ถ้าแก้ endpoint ให้ดู [API_CONTRACT.md](../api/API_CONTRACT.md) และ backend tests คู่กัน
- ถ้าแก้ env/tunnel ให้ดู [ENVIRONMENT.md](../operations/ENVIRONMENT.md)
- ถ้าแก้ frontend structure ให้ดู [FSD_LITE_GUIDE.md](FSD_LITE_GUIDE.md)
