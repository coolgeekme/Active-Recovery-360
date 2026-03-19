# AR360 - Active Recovery 360 E-Commerce Platform

## Original Problem Statement
Build a full-stack e-commerce platform, "AR360," for professional-grade exercise recovery products. The platform supports three user roles:
- **Public**: Can browse products
- **Members**: Access to exclusive products and discounts
- **Doctors/Healthcare Providers**: Access to professional-grade products and personalized storefronts

## Tech Stack (Current - March 2026)

### Production Stack
- **Backend**: FastAPI (Python) - Port 8001
- **Frontend**: React + Vite - Port 3000
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens + Firebase OAuth
- **Payments**: Stripe (test mode)

## Architecture

```
/app
├── backend/                 # FastAPI backend
│   ├── server.py           # Main FastAPI application
│   ├── routes/             # API route handlers
│   │   ├── auth.py         # Authentication (login, register, Firebase)
│   │   ├── products.py     # Product CRUD
│   │   ├── categories.py   # Category CRUD
│   │   ├── cart.py         # Shopping cart
│   │   ├── orders.py       # Order management
│   │   ├── doctors.py      # Doctor profiles
│   │   ├── testimonials.py # Testimonials
│   │   ├── discount_codes.py # Discount codes
│   │   ├── payments.py     # Stripe integration
│   │   ├── admin.py        # Admin endpoints
│   │   └── seed.py         # Database seeding utilities
│   ├── services/           # Business logic
│   │   ├── auth.py         # JWT & password hashing
│   │   └── database.py     # MongoDB connection
│   ├── models/             # Pydantic schemas
│   │   └── schemas.py      # Request/Response models
│   ├── tests/              # Test files
│   │   └── test_ar360_fastapi.py
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks (auth, cart)
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── vite.config.ts
└── memory/                # Documentation
```

## What's Been Completed

### March 19, 2026 - Product Images & Bug Fixes
- ✅ Added stock images to all 69 products via `/api/seed/add-images` endpoint
- ✅ Fixed 34 products with missing images
- ✅ Fixed 26 products with broken external URLs
- ✅ Testing agent fixed critical MongoDB ObjectId parsing bug in product-page.tsx
- ✅ Fixed cart hook type definitions (number -> string for MongoDB IDs)
- ✅ All 32 backend API tests passing
- ✅ Full E2E testing completed successfully

### March 4, 2026 - Complete Tech Stack Rebuild
- ✅ Rebuilt backend with FastAPI (Python)
- ✅ All API endpoints implemented
- ✅ JWT authentication system
- ✅ Firebase OAuth support
- ✅ MongoDB async operations
- ✅ Stripe payment integration
- ✅ Frontend updated for JWT tokens
- ✅ 69 products in database with images

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /api/health` - API health check

### Authentication
- `POST /api/register` - Register new user (returns JWT)
- `POST /api/login` - Login (returns JWT)
- `POST /api/auth/firebase` - Firebase OAuth (returns JWT)
- `POST /api/logout` - Logout
- `GET /api/user` - Get current user (requires JWT)

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product by MongoDB ObjectId
- `POST /api/products` - Create (admin)
- `PUT /api/products/:id` - Update (admin)
- `DELETE /api/products/:id` - Delete (admin)

### Categories
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category

### Cart (Members only)
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update quantity
- `DELETE /api/cart/:id` - Remove item

### Seed (Admin only)
- `GET /api/seed/seed-status` - Check database status
- `POST /api/seed/seed-database` - Seed categories and products
- `POST /api/seed/add-images` - Add images to products without images
- `POST /api/seed/fix-broken-images` - Replace broken external URLs with stock images

## Database Status

- **Products**: 69 (all with stock images from Unsplash)
- **Categories**: 9
- **Users**: Admin seeded on startup

## Test Credentials
- **Admin**: admin / password
- **Kevin**: kevinmacpherson08 / Recovery25!

## Remaining Tasks

### P1 - Next Priority
- [ ] Complete Stripe checkout flow testing
- [ ] Add more product-specific images (currently using category-level stock images)
- [ ] Implement discount code validation in checkout

### P2 - Future Features
- [ ] Doctor storefronts (personalized pages)
- [ ] Admin dashboard improvements
- [ ] Design parity with activerecovery360.com reference
- [ ] Order history and tracking
- [ ] Email notifications

### Technical Debt
- [ ] Add `.limit()` to unbounded database queries in database.py
- [ ] Add data-testid attributes to all interactive elements
- [ ] Improve error handling in cart operations

## Known Issues (Resolved)
- ~~Product detail page showing "Product Not Found"~~ - Fixed: parseInt() was truncating MongoDB ObjectIds
- ~~Products missing images~~ - Fixed: Added stock images via seed endpoint
- ~~Cart type errors~~ - Fixed: Updated ID types from number to string

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017/ar360
DB_NAME=ar360
SESSION_SECRET=<secret>
STRIPE_SECRET_KEY=<stripe-key>
FIREBASE_API_KEY=<firebase-key>
```

### Frontend (.env)
```
VITE_API_URL=
VITE_FIREBASE_API_KEY=<firebase-key>
VITE_FIREBASE_AUTH_DOMAIN=<domain>
VITE_FIREBASE_PROJECT_ID=<project-id>
REACT_APP_BACKEND_URL=https://ar360-shop.preview.emergentagent.com
```
