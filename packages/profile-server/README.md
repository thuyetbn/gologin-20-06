# Profile Server (PostgreSQL)

REST API quản lý profile tập trung cho GoLogin Manager.

## Yêu cầu môi trường
- Node 18+
- PostgreSQL 16.x

## Cấu hình
Tạo `.env` từ `.env.example`:

```
DATABASE_URL=postgresql://profiledata:profiledata@localhost:5432/profiledata
JWT_SECRET=change_me_dev_secret
MASTER_KEY_BASE64=base64_32bytes_key_here
PORT=5055
CORS_ORIGIN=http://localhost:4444
```

## Lệnh
- Cài đặt deps: `yarn` (ở thư mục dự án gốc), sau đó `yarn` tại packages/profile-server
- Prisma: `yarn prisma:generate` và `yarn prisma:migrate`
- Dev: `yarn dev`

## Endpoints sơ bộ
- GET /v1/health
- GET /v1/profiles
- GET /v1/profiles/:id
- GET /v1/profiles/:id/bundle
- POST /v1/profiles
- PUT /v1/profiles/:id (If-Match: version)
- DELETE /v1/profiles/:id
- POST /v1/profiles/:id/lock | /heartbeat | /unlock | /commit
- GET /v1/profiles/:id/cookies | PUT /v1/profiles/:id/cookies
- GET /v1/groups | POST /v1/groups

Lưu ý: JWT/auth sẽ bổ sung sau trong giai đoạn tích hợp bảo mật.

