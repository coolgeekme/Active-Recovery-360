# AR360 - Active Recovery 360 E-Commerce Platform

## Original Problem Statement
Build a full-stack e-commerce platform, "AR360," for professional-grade exercise recovery products. The platform supports three user roles:
- **Public**: Can browse products
- **Members**: Access to exclusive products and discounts
- **Doctors/Healthcare Providers**: Access to professional-grade products and personalized storefronts

## Tech Stack (UPDATED - March 4, 2026)

### Previous Stack (Deprecated)
- Node.js/Express backend
- PostgreSQL with Drizzle ORM
- Vite serving both frontend and backend

### Current Stack (Production-Ready)
- **Backend**: FastAPI (Python) - Port 8002
- **Frontend**: React + Vite - Port 3000
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens + Firebase OAuth
- **Payments**: Stripe
- **Proxy**: Node.js http-proxy - Port 8001

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
│   │   └── admin.py        # Admin endpoints
│   ├── services/           # Business logic
│   │   ├── auth.py         # JWT & password hashing
│   │   └── database.py     # MongoDB connection
│   ├── models/             # Pydantic schemas
│   │   └── schemas.py      # Request/Response models
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
├── api-proxy.ts           # Reverse proxy (8001 -> 8002/3000)
└── memory/                # Documentation
```

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
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create (admin)
- `PUT /api/products/:id` - Update (admin)
- `DELETE /api/products/:id` - Delete (admin)

### Categories
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category
- `POST /api/categories` - Create (admin)
- `PUT /api/categories/:id` - Update (admin)
- `DELETE /api/categories/:id` - Delete (admin)

### Cart (Members only)
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update quantity
- `DELETE /api/cart/:id` - Remove item

### Orders (Members only)
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update status (admin)

### Payments
- `POST /api/create-payment-intent` - Create Stripe payment
- `POST /api/confirm-membership-payment` - Confirm membership

### Admin
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user roles
- `GET /api/admin/orders` - List all orders

## Database Collections (MongoDB)

- **users**: User accounts with roles
- **products**: Product catalog
- **categories**: Product categories
- **cart_items**: Shopping cart
- **orders**: Order history
- **testimonials**: Customer testimonials
- **discount_codes**: Discount codes
- **sessions**: (optional) Session storage

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
```

## What's Been Completed

### March 4, 2026 - Complete Tech Stack Rebuild
- ✅ Rebuilt backend with FastAPI (Python)
- ✅ All API endpoints implemented
- ✅ JWT authentication system
- ✅ Firebase OAuth support
- ✅ MongoDB async operations
- ✅ Stripe payment integration
- ✅ Frontend updated for JWT tokens
- ✅ API proxy configured correctly

### Previous Completions
- ✅ Firebase Authentication
- ✅ UI design and components
- ✅ Product categories
- ✅ Shopping cart
- ✅ Checkout flow

## Remaining Tasks

### P0 - Ready for Testing
- [ ] Deploy to Emergent production
- [ ] Full E2E testing

### P1 - Future Features
- [ ] Doctor storefronts
- [ ] Admin dashboard improvements
- [ ] Design parity with activerecovery360.com

## Test Credentials
- **Admin**: admin / password
- **Kevin**: kevinmacpherson08 / Recovery25!
