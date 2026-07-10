# Environment Guide

เอกสารนี้สรุป env ที่ทีมต้องตั้งเวลา run local, Docker, Vercel และ Cloudflare tunnel/custom domain

ห้าม commit secret, tunnel token, เบอร์จริง หรือ personal data ลง repo

## Local Frontend + Local API

ใช้ตอน dev บนเครื่องเดียวกัน:

```env
EMERGENCY_API_INTERNAL_URL=http://127.0.0.1:4000
NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL=
NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL=
```

Frontend จะเรียก REST ผ่าน `/emergency-api/*` แล้ว Next rewrite ไปหา `EMERGENCY_API_INTERNAL_URL`

SSE local จะ fallback ไป `http://localhost:4000` จาก helper ใน `shared/config`

## Backend API

ตั้งใน `services/emergency-api/.env`:

```env
PORT=4000
DATABASE_URL=postgres://emergency:emergency_dev@localhost:5432/smart_emergency
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

`CORS_ORIGINS` เป็น comma-separated allowlist ถ้ายังใช้ `CORS_ORIGIN` เดี่ยว backend ยังรองรับ fallback อยู่ แต่ควรใช้ `CORS_ORIGINS` เมื่อมีหลาย frontend origin

## Docker Local

ถ้า backend รันใน Docker network ให้ใช้ DB host เป็น `db`:

```env
DATABASE_URL=postgres://emergency:emergency_dev@db:5432/smart_emergency
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://web:3000
```

ถ้าแก้ port หรือ service name ใน Docker ต้องทดสอบ `pnpm db:up`, `pnpm db:migrate`, `pnpm dev:api` และ `/health`

## Vercel Test + Cloudflare/API Domain

Vercel test ปัจจุบันใช้ frontend:

```text
https://smart-emergency-test.vercel.app
```

API domain/tunnel ที่ทีมใช้:

```text
https://emer-api.scgs-ai.com
```

Vercel frontend ควรตั้ง:

```env
NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL=https://emer-api.scgs-ai.com
NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL=https://emer-api.scgs-ai.com
```

เหตุผลที่แยก 2 ค่า:

- REST/polling บน Vercel ใช้ same-origin rewrite `/emergency-api/*` เพื่อลด CORS
- SSE/EventSource ต้องใช้ absolute API URL เพราะเป็น long-lived connection และบาง proxy/tunnel จัดการต่างจาก REST

อย่าตั้ง `EMERGENCY_API_INTERNAL_URL` บน Vercel เป็น `localhost`, `127.0.0.1`, หรือ `http://api:4000` เพราะ Vercel จะมองเป็นเครื่องของ Vercel เอง ไม่ใช่เครื่องเปรม

## Share Channel Settings

Backend รองรับ env fallback สำหรับช่องทางแชร์ตำแหน่ง:

```env
LINE_OA_ID=@smartemergency
SMS_CENTER_PHONE=0812345678
WHATSAPP_CENTER_PHONE=66812345678
```

ถ้าใน settings page มีค่า DB แล้ว DB จะมาก่อน env fallback ห้ามใส่เบอร์จริงใน repo

## Troubleshooting Env

ถ้า frontend เปิดได้แต่ข้อมูลไม่มา:

1. เช็ก `https://emer-api.scgs-ai.com/health`
2. เช็ก `https://smart-emergency-test.vercel.app/emergency-api/health`
3. เช็ก Docker/API/DB/cloudflared บนเครื่องที่ host API
4. เช็ก Vercel env ว่า `NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL` และ `NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL` ชี้ domain เดียวกันหรือไม่

ถ้าเจอ Cloudflare Error 1033 แปลว่า Cloudflare resolve tunnel ไม่ได้ ให้เช็กว่า cloudflared ยังรันและผูกกับ domain ถูก tunnel อยู่

ถ้าแก้ env ต้องทดสอบ:

- API health
- mobile create incident
- admin alert/queue/map/detail
- viewer read-only/passive
- SSE หรือ polling fallback
