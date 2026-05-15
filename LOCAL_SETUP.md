# Local setup — Shopify Support AI (Windows PowerShell)

Step-by-step guide to run the app locally and smoke-test on a Shopify development store.

## Prerequisites

- **Node.js** LTS (v20+). Check:

```powershell
node -v
npm -v
```

- **Shopify CLI** — [Install Shopify CLI](https://shopify.dev/docs/api/shopify-cli)
- **Shopify Partners account** + a **development store**
- **PostgreSQL** — Neon, Supabase, or local (see below)

---

## 1. Clone and install

```powershell
cd "c:\path\to\shopfy-v1"
npm install
```

---

## 2. Environment file

```powershell
Copy-Item .env.example .env
# Edit .env in your editor
```

Required variables:

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | App client ID from Partners |
| `SHOPIFY_API_SECRET` | App client secret |
| `SHOPIFY_APP_URL` | Tunnel URL from `shopify app dev` (set after first run if needed) |
| `SCOPES` | `read_products,read_orders,read_customers,read_fulfillments` |
| `DATABASE_URL` | PostgreSQL connection string |

Optional:

| Variable | Description |
|----------|-------------|
| `STOREFRONT_CORS_ORIGINS` | Leave empty in dev; set in production |
| `OPENAI_API_KEY` | Not required for smoke test |

---

## 3. PostgreSQL options

### A) Neon (recommended)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string (with `?sslmode=require`)
3. Set `DATABASE_URL` in `.env`

### B) Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Project Settings → Database → Connection string (URI)
3. Set `DATABASE_URL` in `.env`

### C) Local PostgreSQL

1. Install PostgreSQL for Windows
2. Create database: `support_ai`
3. Example URL:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/support_ai?schema=public
```

---

## 4. Database schema

```powershell
npx prisma generate
npm run db:push
```

Verify health (app must be running, or use after `shopify app dev`):

```powershell
curl http://localhost:PORT/api/health
```

Expected when DB is OK:

```json
{
  "ok": true,
  "service": "shopify-support-ai",
  "database": "ok",
  "timestamp": "..."
}
```

---

## 5. Quality checks

```powershell
npm run typecheck
npm test
```

---

## 6. Run the Shopify app

```powershell
shopify app dev
```

- Log in to Partners when prompted
- Select your app and development store
- Note the **tunnel URL** — put it in `SHOPIFY_APP_URL` if the CLI does not update `.env` automatically
- Open the app URL from the CLI to complete OAuth install

---

## 7. Smoke test checklist

### Admin

1. **Settings → System status** — Database connected: yes
2. **Settings → Sync now** — Products/orders sync messages
3. **Orders → Order lookup test** — Test with a real order number + email from your dev store
4. **Returns** — After widget return reason test, rows appear here
5. **Dashboard** — Metrics update after conversations

### Theme / widget

1. Online Store → **Customize** theme
2. Add block **Support AI Chat**
3. Set **API base URL** to your tunnel URL (no trailing slash), e.g. `https://xxxx.trycloudflare.com`
4. Save and preview storefront
5. Open chat widget:
   - Type “where is my order” / “kargom nerede” → order form
   - Submit order number + email → tracking reply
   - Type “return” / “iade” → reason buttons → submit

---

## Common errors

| Symptom | Fix |
|---------|-----|
| `Can't reach database server at localhost:5432` | PostgreSQL not running, or use Neon/Supabase `DATABASE_URL` |
| `P1001` | Same as above — check `DATABASE_URL` and network |
| Invalid `DATABASE_URL` | URL-encode special characters in password; include `?sslmode=require` for cloud |
| `shopify app dev` URL changed | Update `SHOPIFY_APP_URL` and theme widget API URL |
| Widget “Configure API base URL” | Theme block API URL empty or wrong |
| CORS blocked | Dev: use `*.myshopify.com` preview; prod: set `STOREFRONT_CORS_ORIGINS` |
| Missing scopes | Reinstall app after updating `SCOPES` / `shopify.app.toml` |
| Order not found (but order exists) | Email must match Shopify order; try **Orders → Test lookup** in admin |
| Sync: no admin session | Reinstall app on the store to refresh OAuth session |

---

## Useful endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | DB connectivity check |
| `POST /api/storefront/chat` | Widget API (storefront) |

---

## Next steps

After smoke test passes locally, proceed to **Milestone 3** (OpenAI safe flows, policies CRUD, billing, etc.).
