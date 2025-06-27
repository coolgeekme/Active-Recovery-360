# Exercise Recovery Alliance (ERA) - System Architecture

## Overview

Exercise Recovery Alliance (ERA) is a full-stack e-commerce web application built for professional-grade recovery products. The system features a React frontend with Express.js backend, utilizing PostgreSQL with Drizzle ORM for data management. The application implements a multi-tier access system where products can be public, member-only, or doctor-exclusive, with specialized doctor storefronts.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state, React Context for local state
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with JSON responses

### Database Schema Design
The system uses a comprehensive schema supporting:
- User management with role-based access (admin, member, doctor)
- Product catalog with visibility controls and doctor associations
- Category-based product organization
- Shopping cart and order management
- Testimonial system for social proof

### Authentication & Authorization
- **Strategy**: Local username/password authentication with Passport.js
- **Session Storage**: PostgreSQL-backed session store for scalability
- **Role-Based Access**: Three-tier system (public, member, doctor) with middleware guards
- **Password Security**: bcrypt hashing with salt rounds

## Key Components

### User Management System
- Multi-role user system supporting regular users, members, doctors, and admins
- Doctor profiles include specialized fields (title, specialty, bio, profile image)
- Membership system with one-time payment model
- Admin dashboard for user and content management

### Product Management
- Three-tier visibility system: public, member-only, doctor-exclusive
- Product association with specific doctors via doctorIds array
- Category-based organization with featured product support
- Inventory tracking with stock quantity management

### Shopping Cart & Orders
- Session-based cart management for authenticated users
- Order processing with status tracking
- Integration with user membership validation for product access

### Doctor Storefronts
- Personalized storefronts for healthcare professionals
- Curated product collections based on doctor specialties
- Professional profile display with credentials and bio

## Data Flow

### User Authentication Flow
1. User submits credentials via login form
2. Passport.js validates against database using bcrypt comparison
3. Session created and stored in PostgreSQL session store
4. User object stored in session for subsequent requests
5. Protected routes check authentication status via middleware

### Product Access Control Flow
1. Product visibility determined by user role and product settings
2. Public products: accessible to all users
3. Member products: require active membership status
4. Doctor products: restricted to verified healthcare professionals
5. Shopping cart validates access permissions before allowing purchases

### Order Processing Flow
1. Cart items validated for user access permissions
2. Order created with user and product associations
3. Cart cleared upon successful order creation
4. Order status tracking enabled for user monitoring

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver for database connectivity
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management with caching
- **@radix-ui/\***: Accessible UI component primitives
- **passport**: Authentication middleware with local strategy
- **bcrypt**: Password hashing and validation
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Dependencies
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds
- **@tailwindcss/vite**: Tailwind CSS integration with Vite

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility
- **lucide-react**: Icon library for consistent iconography

## Deployment Strategy

### Build Process
- **Development**: tsx server with Vite middleware for hot reloading
- **Production**: esbuild bundling for optimized server build, Vite build for client assets
- **Asset Management**: Static files served from dist/public directory

### Environment Configuration
- **Database**: Requires DATABASE_URL environment variable for PostgreSQL connection
- **Sessions**: Configurable session secret for security
- **Replit Integration**: Configured for Replit deployment with auto-scaling

### Server Configuration
- **Port**: Configurable port (default 5000) with external port mapping
- **Trust Proxy**: Enabled for deployment behind reverse proxy
- **CORS**: Configured for cross-origin requests in development

## Changelog

- June 27, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.