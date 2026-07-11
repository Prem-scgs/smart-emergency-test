# Environment Guide

เอกสารนี้บอกว่าแต่ละ environment ใช้ค่าใด และแก้ตรงไหนจึงกระทบ frontend, API หรือ realtime จริง ค่าใช้งานจริงต้องอยู่ใน Vercel Environment Variables, host secret manager หรือไฟล์ `.env` ที่ถูก ignore เท่านั้น

`.env.example` และ `services/emergency-api/.env.example` เป็น checklist สำหรับคนตั้งระบบใหม่ ไม่ใช่ไฟล์ที่ runtime โหลดโดยตรง และต้องไม่มี secret, Cloudflare token, เบอร์โทรจริง หรือ database credential ของระบบจริง

## 1. Cloud-First Runtime ของทีม

| ส่วน | ค่าใช้งานปัจจุบัน | ผลกระทบเมื่อหยุดทำงาน |
| --- | --- | --- |
| Frontend test | `https://smart-emergency-test.vercel.app` | ผู้ใช้เปิด UI ไม่ได้ถ้า Vercel มีปัญหา |
| API domain | `https://emer-api.scgs-ai.com` | REST, admin data และ mobile tracking ใช้งานไม่ได้ |
| API/DB | Docker/host machine ของทีม | API health, data, GIS และ write flow ใช้งานไม่ได้ |
| Tunnel | Cloudflare named tunnel/custom domain | Vercel ไปไม่ถึง API และมักเห็น Error 1033 |

ตั้งใน Vercel Environment Variables ของ deployment test:

```env
NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL=https://emer-api.scgs-ai.com
NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL=https://emer-api.scgs-ai.com
```

ค่าแรกให้ Next.js rewrite REST/polling จาก `/emergency-api/*` ไป API domain จึงลด CORS ฝั่ง browser ได้ ส่วนค่าที่สองใช้กับ `EventSource` โดยตรง เพราะ SSE เป็น connection ระยะยาวและไม่ควรอาศัย fallback localhost

ห้ามตั้ง `EMERGENCY_API_INTERNAL_URL` บน Vercel เป็น `localhost`, `127.0.0.1` หรือ `http://api:4000`; ค่าเหล่านั้นอ้างถึงเครื่อง/container ของ Vercel เอง ไม่ใช่เครื่อง host API ของทีม

## 2. API Host / Docker

ตั้งค่าจริงใน `services/emergency-api/.env` หรือ secret manager ของ host:

```env
PORT=4000
DATABASE_URL=postgres://<db-user>:<db-password>@<db-host>:5432/<db-name>
CORS_ORIGINS=https://smart-emergency-test.vercel.app
JWT_SECRET=<random-secret-at-least-32-characters>
ADMIN_BOOTSTRAP_EMAIL=<initial-super-admin-email>
ADMIN_BOOTSTRAP_PASSWORD=<initial-super-admin-password>
ADMIN_BOOTSTRAP_NAME=<initial-super-admin-display-name>
```

`JWT_SECRET` เป็น secret ฝั่ง API เท่านั้น ห้ามใส่ใน Vercel frontend หรือชื่อตัวแปร `NEXT_PUBLIC_*` และต้องยาวอย่างน้อย 32 ตัวอักษร หากไม่มีค่านี้ API จะไม่ start

ค่า `ADMIN_BOOTSTRAP_*` ต้องตั้งครบทั้งสามตัวในครั้งแรกหลัง migration `021_admin_user_auth.sql` ระบบจะสร้างบัญชีเฉพาะเมื่อยังไม่มี `super_admin` ที่ active หลังสร้างบัญชีทีมครบแล้วสามารถเอาค่า bootstrap ออกจาก runtime env ได้

`CORS_ORIGINS` เป็น comma-separated allowlist ใช้เมื่อ browser เรียก API ข้าม origin ถ้าเพิ่ม domain frontend ใหม่แล้วลืมค่านี้ จะเห็น CORS failure แม้ `/health` จะยังตอบปกติ

ระบบ share location รองรับ env fallback ต่อไปนี้เมื่อ System Settings ใน DB ยังไม่มีค่า override:

```env
LINE_OA_ID=@your-line-oa
SMS_CENTER_PHONE=<international-phone-number>
WHATSAPP_CENTER_PHONE=<international-phone-number>
```

ค่าเหล่านี้มีผลต่อช่องทางแชร์ตำแหน่งของ mobile เท่านั้น และไม่ควรใส่ข้อมูลจริงใน template หรือ Git

เมื่อแก้ source ของ API แต่ Docker ยังรัน image เก่า ต้อง rebuild/recreate เฉพาะ API:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml build api
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api
```

คำสั่งนี้ไม่ลบ database volume แต่ควรตรวจ `https://emer-api.scgs-ai.com/health` และ endpoint ที่เพิ่งแก้หลัง container กลับมา

## 3. Local Fallback สำหรับ Debug

ใช้เฉพาะเมื่อจำเป็นต้อง debug เครื่องเดียวหรือ replay migration:

```env
# root .env สำหรับ Next.js
EMERGENCY_API_INTERNAL_URL=http://127.0.0.1:4000

# services/emergency-api/.env สำหรับ Fastify
PORT=4000
DATABASE_URL=postgres://emergency:emergency_dev@localhost:5432/smart_emergency
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
JWT_SECRET=<local-random-secret-at-least-32-characters>
```

Local REST จะวิ่งผ่าน Next rewrite และ local SSE จะ fallback ไป `http://localhost:4000` จาก `shared/config/emergency-api.ts`

สำหรับ Docker local API ใช้ service name `db` และ web ใช้ `api`:

```env
DATABASE_URL=postgres://emergency:emergency_dev@db:5432/smart_emergency
EMERGENCY_API_INTERNAL_URL=http://api:4000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://web:3000
JWT_SECRET=<local-random-secret-at-least-32-characters>
```

`docker-compose.local.yml` มีค่าหลักสำหรับ local stack อยู่แล้ว อย่าคัดลอกค่าจาก Docker ไปใช้บน Vercel

## 4. Troubleshooting

เมื่อ Vercel เปิดได้แต่ข้อมูลหาย ให้ตรวจตามลำดับ:

1. เปิด `https://emer-api.scgs-ai.com/health`
2. เปิด `https://smart-emergency-test.vercel.app/emergency-api/health`
3. ตรวจ API container/process และ DB บนเครื่อง host
4. ตรวจ cloudflared/named tunnel ว่ายัง online และ hostname ชี้ tunnel ที่ถูกต้อง
5. ตรวจ Vercel variables สองตัวให้ชี้ `https://emer-api.scgs-ai.com`

Cloudflare Error 1033 หมายถึง Cloudflare หา connector ของ tunnel ไม่เจอ ไม่ใช่ frontend bug โดยตรง ให้ตรวจ cloudflared, network ของเครื่อง host, API health และการผูก hostname กับ tunnel ก่อนแก้โค้ด

หลังเปลี่ยน env ให้ทดสอบอย่างน้อย API health, mobile create incident, admin alert/queue/map/detail, viewer read-only/passive และ SSE หรือ polling fallback
