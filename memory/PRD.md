# AR360 - Active Recovery 360 E-Commerce Platform

## Original Problem Statement
Build a full-stack e-commerce platform, "AR360," for professional-grade exercise recovery products. The platform supports three user roles:
- **Public**: Can browse products
- **Members**: Access to exclusive products and discounts
- **Doctors/Healthcare Providers**: Access to professional-grade products and personalized storefronts

## Core Requirements
- User registration/login (username/password + Google OAuth via Firebase)
- Role-based access control (Public, Member, Doctor, Admin)
- Product catalog with visibility levels (public, member-only, doctor-exclusive)
- Category organization
- Shopping cart and checkout
- Order management (Pending, Completed, Canceled)
- Discount code system (percentage or fixed value)
- Stripe integration for payments
- Doctor storefronts
- Admin dashboard

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Firebase (Email/Password, Google Sign-in), Passport.js sessions
- **Payments**: Stripe

## Architecture

```
/app
├── client/              # React frontend (Vite)
│   └── src/
│       ├── components/  # UI components
│       ├── pages/       # Page components
│       ├── hooks/       # Custom hooks
│       └── lib/         # Utilities, Firebase config
├── server/              # Express backend
│   ├── auth.ts          # Authentication (Passport.js + Firebase)
│   ├── db.ts            # MongoDB connection
│   ├── models.ts        # Mongoose schemas
│   ├── routes.ts        # API routes
│   ├── storage.ts       # MongoDB data access layer
│   ├── types.ts         # TypeScript interfaces
│   └── index.ts         # Server entry point
└── package.json
```

## Database Schema (MongoDB)

### User
- username, email, fullName, password
- isMember, isAdmin, isDoctor
- doctorTitle, doctorSpecialty, doctorBio, profileImage

### Product
- name, description, price (cents), imageUrl
- visibility: 'public' | 'member' | 'doctor'
- categoryId, stockQuantity, featured, doctorIds

### Category
- name, description, imageUrl, productCount

### Order
- userId, totalAmount, status, items, shippingAddress

### CartItem
- userId, productId, quantity

### DiscountCode
- code, description, discountType, discountValue
- isActive, usageLimit, usedCount, expiresAt

### Testimonial
- author, role, content, imageUrl, featured

## API Endpoints

### Public
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product
- `GET /api/categories` - List categories
- `GET /api/testimonials` - List testimonials
- `GET /api/doctors` - List doctors
- `POST /api/discount-codes/validate` - Validate discount code

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login (username/password)
- `POST /api/auth/firebase` - Firebase authentication
- `POST /api/logout` - Logout
- `GET /api/user` - Get current user

### Members Only
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders

### Admin Only
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/role` - Update user roles
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/discount-codes` - List discount codes
- `POST /api/discount-codes` - Create discount code
- `PUT /api/discount-codes/:id` - Update discount code
- `DELETE /api/discount-codes/:id` - Delete discount code

## What's Been Implemented

### March 3, 2026 - MongoDB Migration Complete ✅
- Migrated entire backend from PostgreSQL/Drizzle to MongoDB/Mongoose
- Created new data access layer (storage.ts) with MongoDB operations
- Updated authentication to work with MongoDB string IDs
- Implemented proper _id to id transformation for API responses
- Added connect-mongo for session storage
- Cleaned up obsolete PostgreSQL/Vercel files
- All 28 backend tests passing
- Frontend fully functional with MongoDB backend

### Previous Work
- Firebase Authentication (Email/Password + Google Sign-in)
- UI updates and content changes
- Product categories from user requirements
- PREVIEW watermark across pages

## Test Credentials
- **Admin (API only)**: admin / password
- **Kevin (API only)**: kevinmacpherson08 / Recovery25!
- **Frontend**: Use Firebase Google Sign-in or create account

## Remaining Tasks

### P1 - High Priority
- [ ] Full E2E testing of checkout flow with Stripe
- [ ] Doctor storefront implementation
- [ ] Admin dashboard build-out

### P2 - Medium Priority
- [ ] Design parity with activerecovery360.com
- [ ] Profile management improvements
- [ ] Order history display

### P3 - Low Priority
- [ ] Email notifications for orders
- [ ] Product reviews/ratings
- [ ] Wishlist functionality

## Environment Variables
```
MONGO_URL=mongodb://localhost:27017/ar360
SESSION_SECRET=ar360-session-secret-key-2024
STRIPE_SECRET_KEY=sk_test_emergent
FIREBASE_API_KEY=<firebase-key>
```

## Deployment
- Application is now deployable on Emergent's native environment
- Uses MongoDB (running locally or can be configured for remote)
- No longer requires PostgreSQL or Vercel
