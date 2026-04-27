# AR360 - Active Recovery 360 E-Commerce Platform

## Original Problem Statement
Build a full-stack e-commerce platform, "AR360," for professional-grade exercise recovery products. Four user roles:
- **Non-Member (Public)**: Can browse public products
- **Member**: Paid users with access to exclusive products and discounts
- **Healthcare Professional (HCP)**: Verified professionals with access to doctor-grade products
- **Admin**: Full system management access

## Tech Stack
- **Backend**: FastAPI (Python) - Port 8001
- **Frontend**: React + Vite - Port 3000
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: Hybrid (Firebase OAuth + Custom JWT)
- **Payments**: Stripe (test mode)
- **Email**: Resend
- **Object Storage**: Emergent Object Storage (for product images)

## User Roles & Permissions
| Role | Browse Public | Browse Member | Browse HCP | Checkout | Admin Panel |
|------|--------------|---------------|------------|----------|-------------|
| Non-Member | ✅ | ❌ | ❌ | ❌ | ❌ |
| Member | ✅ | ✅ | ❌ | ✅ | ❌ |
| HCP (Approved) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

## What's Been Completed

### April 27, 2026 — Catalog Import & Object Storage
- ✅ **Object Storage**: Wired Emergent Object Storage (`backend/services/storage.py`)
- ✅ **Public file proxy**: `GET /api/files/{path:path}` streams images from object storage
- ✅ **Catalog refresh**: Imported 39 consolidated products from official Google Sheet via one-shot script `backend/scripts/import_products.py`
  - Replaced legacy 39 mock products
  - Variants properly aggregated: Incrediwear Knee Sleeve (25), Hampton Adams 2-Pack (10), Hampton Adams Clinic Roll (10), etc.
  - Visibility set per product type: CBD → member, Marc Pro / Squid Go / Bio Blade / Bow Scraper → doctor
- ✅ **Official imagery**: Uploaded 27 product images from user's Google Drive folder to object storage; 9 mapped to specific products, 18 reserved for kinesiology tape variants
- ✅ **2 new categories created**: Cold Compression, Exercise Therapy (now 11 total)
- ✅ **Bug fixed**: Admin-login flow now hard-navigates via `window.location.assign` to bypass React-Query hydration race
- ✅ **Bug fixed**: Replaced broken Unsplash fallback URL (1583912267550-d6c2ac3196c0) for 4 Electro Therapy & Cold Compression products

### March 19, 2026 — Authentication & User Roles
- ✅ Resend password reset (`/api/forgot-password`, `/api/reset-password`)
- ✅ HCP application & approval workflow (`/api/admin/hcp/*`)
- ✅ Dedicated `/admin-login` page for JWT staff login (bypasses Firebase)
- ✅ Made `reggie@coolgeek.me` an admin

### Earlier
- ✅ Product variants system, multi-size/color dropdowns
- ✅ Stripe payments
- ✅ Cart, orders, categories, doctor storefronts (basic)

## API Endpoints (current)

### Auth
- `POST /api/register`
- `POST /api/login` → `{token, user}`
- `POST /api/auth/firebase`
- `POST /api/forgot-password`, `/api/reset-password`
- `POST /api/hcp/reapply`

### Products / Catalog
- `GET /api/products` (filters: visibility, categoryId, featured, doctorId)
- `GET /api/products/{id}`
- `POST/PUT/DELETE /api/products/{id}` (admin)
- `GET /api/categories`
- `GET /api/files/{path}` — public image proxy

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/hcp/pending|all`
- `POST /api/admin/hcp/{id}/approve|reject`

## Database Schema (key)

### products
```
{ _id, name, description, price, imageUrl, visibility, categoryId,
  stockQuantity, featured, doctorIds, brand, hasVariants,
  variants: [{sku, name, price, stockQuantity, attributes}],
  createdAt }
```

### users
```
{ _id, username, email, password, fullName, isMember, isAdmin, isDoctor,
  licenseNumber, specialty, hcpStatus, hcpAppliedAt, ...,
  resetToken, resetTokenExpiry }
```

## Environment Variables
```
MONGO_URL, DB_NAME
SESSION_SECRET, JWT secret
STRIPE_SECRET_KEY
FIREBASE_API_KEY
RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL
EMERGENT_LLM_KEY        # for Object Storage
OBJ_STORAGE_APP_NAME=ar360
```

## Test Credentials (also in /app/memory/test_credentials.md)
- Admin: `admin@example.com` / `password` (use `/admin-login`)
- HCP: `drsmith` / `test123` (approved)

## Remaining Tasks (P1/P2)
- [ ] **(P1)** Stripe checkout flow E2E with new variant products
- [ ] **(P1)** Admin dashboard: include category count in `/api/admin/stats` (currently hard-coded "Categories: 4")
- [ ] **(P2)** Doctor storefronts with personalized recommendations
- [ ] **(P2)** Discount code application at checkout
- [ ] **(P2)** UI alignment with `activerecovery360.com` reference
- [ ] **(Tech debt)** Add `.limit()` to unbounded DB queries in services/database.py
