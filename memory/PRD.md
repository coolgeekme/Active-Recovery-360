# AR360 - Active Recovery 360 E-Commerce Platform

## Original Problem Statement
Build a full-stack e-commerce platform, "AR360," for professional-grade exercise recovery products. The platform supports four user roles:
- **Non-Member (Public)**: Can browse public products
- **Member**: Paid users with access to exclusive products and discounts
- **Healthcare Professional (HCP)**: Verified professionals with access to doctor-grade products
- **Admin**: Full system management access

## Tech Stack

### Production Stack
- **Backend**: FastAPI (Python) - Port 8001
- **Frontend**: React + Vite - Port 3000
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: Hybrid (Firebase OAuth + Custom JWT)
- **Payments**: Stripe (test mode)
- **Email**: Resend

## User Roles & Permissions

| Role | Browse Public | Browse Member | Browse HCP | Checkout | Admin Panel |
|------|--------------|---------------|------------|----------|-------------|
| Non-Member | ✅ | ❌ | ❌ | ❌ | ❌ |
| Member | ✅ | ✅ | ❌ | ✅ | ❌ |
| HCP (Approved) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

## What's Been Completed

### March 19, 2026 - Authentication & User Roles

#### Password Reset System
- ✅ `POST /api/forgot-password` - Request password reset email
- ✅ `POST /api/reset-password` - Reset password with token
- ✅ Frontend pages: `/forgot-password` and `/reset-password`
- ✅ Resend email integration (requires API key)
- ✅ Secure token generation with 1-hour expiry

#### HCP Approval System
- ✅ Registration with HCP application (license number, specialty)
- ✅ `hcpStatus` field: pending → approved/rejected
- ✅ Admin endpoints for HCP management:
  - `GET /api/admin/hcp/pending` - List pending applications
  - `GET /api/admin/hcp/all` - List all applications
  - `POST /api/admin/hcp/:id/approve` - Approve HCP
  - `POST /api/admin/hcp/:id/reject` - Reject HCP
- ✅ Admin HCP Management page at `/admin/hcp`
- ✅ Email notifications on approval/rejection
- ✅ Rejected users can reapply via `POST /api/hcp/reapply`

#### Admin Dashboard Stats
- ✅ `GET /api/admin/stats` - Dashboard statistics
  - Total users, members, HCPs, pending HCP applications
  - Total products, orders, pending orders

### Previous Sessions
- ✅ Product variants system (13 products with variants)
- ✅ All 39 products have stock images
- ✅ MongoDB ObjectId parsing fixed
- ✅ Cart supports variant SKU

## API Endpoints

### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/register` | POST | None | Register (supports HCP application) |
| `/api/login` | POST | None | Login (returns JWT) |
| `/api/auth/firebase` | POST | None | Firebase OAuth login |
| `/api/forgot-password` | POST | None | Request password reset |
| `/api/reset-password` | POST | None | Reset password with token |
| `/api/hcp/reapply` | POST | JWT | Reapply for HCP status |

### Admin
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/stats` | GET | Admin | Dashboard statistics |
| `/api/admin/users` | GET | Admin | List all users |
| `/api/admin/hcp/pending` | GET | Admin | Pending HCP applications |
| `/api/admin/hcp/all` | GET | Admin | All HCP applications |
| `/api/admin/hcp/:id/approve` | POST | Admin | Approve HCP |
| `/api/admin/hcp/:id/reject` | POST | Admin | Reject HCP |

## Database Schema Updates

### User Document
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  fullName: String,
  isMember: Boolean,
  isAdmin: Boolean,
  isDoctor: Boolean,
  // HCP Fields
  licenseNumber: String,
  specialty: String,
  hcpStatus: "pending" | "approved" | "rejected" | null,
  hcpAppliedAt: Date,
  hcpApprovedAt: Date,
  hcpRejectedAt: Date,
  hcpApprovedBy: ObjectId,
  hcpRejectionReason: String,
  // Password Reset
  resetToken: String,
  resetTokenExpiry: Date
}
```

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017/ar360
DB_NAME=ar360
SESSION_SECRET=<secret>
STRIPE_SECRET_KEY=<stripe-key>
FIREBASE_API_KEY=<firebase-key>

# Resend Email (required for password reset)
RESEND_API_KEY=<your-resend-api-key>
SENDER_EMAIL=onboarding@resend.dev
FRONTEND_URL=https://ar360-shop.preview.emergentagent.com
```

## Test Credentials
- **Admin**: admin / password
- **Test HCP**: drsmith / test123 (approved)

## Remaining Tasks

### P1 - Next Priority
- [ ] **Resend API Key**: User needs to add their Resend API key to enable password reset emails
- [ ] Test full checkout flow with variant products
- [ ] Update order history to display variant details

### P2 - Future Features
- [ ] Doctor storefronts with personalized product recommendations
- [ ] Admin dashboard enhancements (charts, reports)
- [ ] Discount codes functionality
- [ ] UI alignment with activerecovery360.com reference

### Technical Debt
- [ ] Add `.limit()` to unbounded database queries
- [ ] Add comprehensive data-testid attributes
