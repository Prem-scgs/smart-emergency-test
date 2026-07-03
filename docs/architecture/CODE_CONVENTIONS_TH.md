# Code Conventions ภาษาไทย

เอกสารนี้เป็นกฎกลางสำหรับการแก้โค้ด Smart Emergency หลังจากนี้ เป้าหมายคือให้จูเนียร์หรือคนที่มารับงานต่ออ่านแล้วเข้าใจเหตุผลของโค้ดได้เร็ว โดยไม่ทำให้โปรเจกต์รกหรือเพิ่ม comment ที่ไม่จำเป็น

## หลักการสำคัญ

- ทุก code change ที่แตะ logic สำคัญต้องเช็คว่า comment และ docs ที่เกี่ยวข้องต้องอัปเดตด้วยหรือไม่
- Comment ใช้ภาษาไทยได้ และควรใช้เพื่ออธิบายเหตุผลของ business logic ไม่ใช่แปล syntax
- Docs ต้องอัปเดตใน commit เดียวกันเมื่อมีการเปลี่ยน flow, API, env, schema, realtime, หรือโครงสร้างไฟล์
- ไฟล์ใหม่ต้องวางตาม FSD-lite ตั้งแต่ต้น หลีกเลี่ยงการเพิ่ม runtime code ใหม่ใน `lib/`
- ไฟล์ generated, shadcn/ui, mapcn/ui, หรือ utility ที่ชัดเจนอยู่แล้ว ไม่ต้องยัด comment ภาษาไทยเพิ่ม ให้สรุปภาพรวมไว้ใน docs แทน

## กฎ Comment ภาษาไทย

ควรใส่ comment เมื่อโค้ดมีเรื่องเหล่านี้:

- Business rule: เช่น role scope, agency filter, ownership check, status transition, rate limit
- Fallback: เช่น SSE หลุดแล้ว polling แทน, API URL fallback, copy/share fallback
- Realtime: เช่น กัน event ซ้ำ, cursor polling, reconnect behavior
- GIS: เช่น point-in-polygon, fit bounds, GeoJSON `[lng, lat]` เทียบกับ DB `latitude/longitude`
- API/DB integration: เช่น query ที่ต้อง join หลายตาราง, migration compatibility, audit log ที่ไม่ควรเก็บข้อมูลอ่อนไหว
- Security boundary: เช่น mock auth header เป็น dev/demo only ไม่ใช่ auth จริง

ไม่ควรใส่ comment เมื่อโค้ดชัดเจนอยู่แล้ว:

```ts
// ไม่ต้องเขียน: ตั้งค่า name ให้เท่ากับ input
const name = input.name
```

ตัวอย่าง comment ที่ดี:

```ts
// ใช้ cursor จากเวลาที่ dashboard เริ่มทำงาน เพื่อไม่ replay incident เก่าจน alert ซ้ำตอนเปิดหน้าใหม่
const cursor = startedAtRef.current
```

```ts
// agency_admin เห็นและแก้ไขได้เฉพาะหมวดเหตุของตัวเอง ส่วน super_admin เห็นได้ทุกหมวด
const scopedCategory = user.role === 'agency_admin' ? user.category : request.category
```

## กฎ Docs

ต้องอัปเดต docs เมื่อมีการเปลี่ยนเรื่องเหล่านี้:

- เพิ่ม/แก้ endpoint หรือ response shape: อัปเดต docs ที่เกี่ยวกับ API หรือ runbook
- เพิ่ม/แก้ env variable: อัปเดต README, RUNBOOK, หรือ env guide ที่เกี่ยวข้อง
- เปลี่ยน migration/schema: อัปเดต RUNBOOK และ migration notes
- เปลี่ยน realtime behavior: อัปเดต realtime guide หรือ handoff/session note
- เปลี่ยน GIS behavior: อัปเดต GIS guide หรือ architecture note
- เปลี่ยนโครงสร้างไฟล์: อัปเดต `docs/architecture/FSD_LITE_GUIDE.md`

ถ้าเปลี่ยนเล็กมากและไม่มีผลต่อคนใช้งานหรือคนดูแล ให้เขียนใน commit summary แทนได้ แต่ต้องตั้งใจตัดสินใจ ไม่ใช่ลืม

## กฎ FSD-lite สำหรับไฟล์ใหม่

ก่อนสร้างไฟล์ใหม่ ให้ตอบให้ได้ว่าไฟล์นี้อยู่ชั้นไหน:

- `app/`: route, layout, page composition เท่านั้น
- `widgets/`: UI ก้อนใหญ่ที่ประกอบหลาย feature/entity เช่น dashboard map, incident queue
- `features/`: workflow/action เช่น alert, status update, report export, contact form
- `entities/`: domain model, mapper, type, formatter ของ incident/contact/area/category
- `shared/`: API client, realtime helper, i18n, config, UI primitive, utility ที่ใช้ข้าม domain
- `lib/`: bridge export ชั่วคราวสำหรับ path เก่าเท่านั้น ห้ามเพิ่ม runtime logic ใหม่

## Checklist ก่อน Commit

ก่อน commit ทุกครั้งให้ตอบ 5 ข้อนี้:

1. Build/test ที่เกี่ยวข้องผ่านหรือยัง
2. Logic สำคัญมี comment ภาษาไทยในจุดที่ควรอธิบายหรือยัง
3. Docs ที่เกี่ยวข้องอัปเดตแล้วหรือยัง
4. ไฟล์ใหม่วางถูก FSD-lite layer หรือยัง
5. ถ้ายังใช้ `lib/` เป็น path เก่า มี bridge หรือแผนย้ายชัดเจนหรือยัง

## แนวทางสำหรับคนมาทำต่อ

- ถ้าแก้ bug ให้เริ่มจากอ่าน flow จริงและ docs ก่อน อย่าเดาจากชื่อไฟล์อย่างเดียว
- ถ้าเพิ่ม feature ใหม่ ให้สร้างไฟล์ใน FSD-lite layer ที่ถูกต้องตั้งแต่ต้น
- ถ้าต้องแตะ legacy path ใน `lib/` ให้พิจารณาย้าย implementation ไป `shared/`, `entities/`, `features/`, หรือ `widgets/` แล้วให้ `lib/` re-export แทน
- ถ้าไม่แน่ใจว่าไฟล์ควรอยู่ไหน ให้เขียน note ใน PR/commit แล้วถามก่อนย้ายใหญ่
