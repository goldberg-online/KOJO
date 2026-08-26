# DIS ONLINE — KOJO

**Doorbell International School** · Motto: *Christ is our light*  
Platform: **DIS ONLINE** · Package: **KOJO**

Next.js 15 school management (Prisma + PostgreSQL + Auth.js). Currency: **GH₵**.

## Deploy on Vercel

1. Open [vercel.com/new](https://vercel.com/new)
2. Import this GitHub repo: **goldberg-online/KOJO**
3. Framework: **Next.js** (auto-detected)
4. Add these Environment Variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Your Supabase **Transaction pooler** URI (port **6543**) plus `?pgbouncer=true&connection_limit=5&pool_timeout=30&sslmode=require` |
| `AUTH_SECRET` | Long random string (`openssl rand -base64 32`) |
| `NEXTAUTH_SECRET` | Same as AUTH_SECRET is fine |
| `NEXTAUTH_URL` | Your Vercel URL, e.g. `https://kojo.vercel.app` (update after first deploy) |
| `AUTH_URL` | Same as NEXTAUTH_URL |
| `SMS_PROVIDER` | `mock` |
| `SMS_SENDER_ID` | `DISOnline` |

5. Deploy
6. After first deploy, set `NEXTAUTH_URL` / `AUTH_URL` to the real `https://….vercel.app` URL, then Redeploy

Seed the database once (from your computer, with the same DATABASE_URL):

```bash
npm install
npx prisma db push
npm run seed
```

Do **not** put real passwords in this repo. Keep them only in Vercel Environment Variables and your local `.env`.

## Roles

| Role | Main job |
|------|----------|
| Super Admin | Allocate logins, full access |
| School Admin | Academic structure; assign subjects; view students |
| Accountant | Enrol, billing, receipts, other income, expenses, salaries |
| Service Officer | Bus & feeding collections |
| Teacher | Attendance and marks for assigned classes |
| Parent / Student | View fees (parent acts for child) |

## Local run

```bash
cp .env.example .env
# fill DATABASE_URL and secrets
npm install
npx prisma db push
npm run seed
npm run dev
```
