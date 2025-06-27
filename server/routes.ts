import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import Stripe from "stripe";
import { 
  insertProductSchema, 
  insertCategorySchema, 
  insertCartItemSchema,
  insertOrderSchema,
  insertDiscountCodeSchema
} from "@shared/schema";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is an admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin access required" });
};

// Middleware to check if user is a member
const isMember = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user.isMember) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Membership required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Stripe payment routes for membership
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, discountCode } = req.body;
      let finalAmount = amount;
      let appliedDiscount = null;
      
      // If discount code is provided, validate and apply it
      if (discountCode) {
        try {
          const discount = await storage.getDiscountCodeByCode(discountCode.toUpperCase());
          
          if (!discount) {
            return res.status(400).json({ message: "Invalid discount code" });
          }
          
          // Check if discount code is still valid
          if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
            return res.status(400).json({ message: "Discount code has expired" });
          }
          
          if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            return res.status(400).json({ message: "Discount code usage limit reached" });
          }
          
          // Apply discount
          if (discount.discountType === "percentage") {
            finalAmount = amount - (amount * discount.discountValue / 100);
          } else {
            // Fixed discount (convert from cents to dollars)
            finalAmount = Math.max(0, amount - (discount.discountValue / 100));
          }
          
          appliedDiscount = discount;
        } catch (error) {
          console.error("Error validating discount code:", error);
          return res.status(400).json({ message: "Error validating discount code" });
        }
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          type: "membership",
          ...(discountCode && { discountCode })
        },
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        appliedDiscount: appliedDiscount,
        finalAmount: finalAmount
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Confirm membership payment and update user
  app.post("/api/confirm-membership-payment", isAuthenticated, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === "succeeded" && paymentIntent.metadata.type === "membership") {
        // If payment used a discount code, increment its usage
        const discountCode = paymentIntent.metadata?.discountCode;
        if (discountCode) {
          try {
            const discount = await storage.getDiscountCodeByCode(discountCode);
            if (discount) {
              await storage.incrementDiscountCodeUsage(discount.id);
            }
          } catch (error) {
            console.error("Error updating discount code usage:", error);
            // Don't fail the payment confirmation if discount update fails
          }
        }
        
        // Update user to be a member
        const updatedUser = await storage.updateUser(req.user!.id, { isMember: true });
        
        if (updatedUser) {
          const { password, ...userWithoutPassword } = updatedUser;
          res.json(userWithoutPassword);
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } else {
        res.status(400).json({ message: "Payment not completed" });
      }
    } catch (error: any) {
      console.error("Error confirming membership payment:", error);
      res.status(500).json({ message: "Error confirming payment: " + error.message });
    }
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const { visibility, categoryId, featured, doctorId } = req.query;
      
      // Filter options
      const filters: any = {};
      
      // Only filter by visibility if it's explicitly specified
      if (visibility) {
        filters.visibility = visibility as string;
      }
      
      if (categoryId) filters.categoryId = parseInt(categoryId as string);
      if (featured) filters.featured = featured === 'true';
      if (doctorId) filters.doctorId = parseInt(doctorId as string);
      
      // Note: We're allowing public users to view all products
      // They just can't purchase member or doctor products
      // This is intentionally commented out now
      /* 
      if (filters.visibility === "member" && (!req.isAuthenticated() || !req.user.isMember)) {
        return res.status(403).json({ message: "Membership required to view these products" });
      }
      
      if (filters.visibility === "doctor" && (!req.isAuthenticated() || !req.user.isDoctor)) {
        return res.status(403).json({ message: "Doctor access required to view these products" });
      }
      */
      
      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Note: We're allowing public users to view all product details
      // They just can't purchase member or doctor products
      // This is intentionally commented out now
      /*
      if (product.visibility === "member" && (!req.isAuthenticated() || !req.user.isMember)) {
        return res.status(403).json({ message: "Membership required to view this product" });
      }
      
      if (product.visibility === "doctor" && (!req.isAuthenticated() || !req.user.isDoctor)) {
        return res.status(403).json({ message: "Doctor access required to view this product" });
      }
      */
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Admin product management routes
  app.post("/api/products", isAdmin, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", isAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const productData = req.body;
      
      const updatedProduct = await storage.updateProduct(productId, productData);
      
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const success = await storage.deleteProduct(productId);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", isAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Doctor routes
  app.get("/api/doctors", async (req, res) => {
    try {
      const doctors = await storage.getDoctors();
      res.json(doctors.map(doctor => {
        // Remove password from response
        const { password, ...doctorWithoutPassword } = doctor;
        return doctorWithoutPassword;
      }));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      const doctor = await storage.getDoctor(doctorId);
      
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      
      // Remove password from response
      const { password, ...doctorWithoutPassword } = doctor;
      res.json(doctorWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch doctor" });
    }
  });

  // Cart routes (members only)
  app.get("/api/cart", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const cartItems = await storage.getCartItems(userId);
      
      // Get product details for each cart item
      const cartWithProducts = await Promise.all(
        cartItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            ...item,
            product
          };
        })
      );
      
      res.json(cartWithProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", isMember, async (req, res) => {
    try {
      const userId = req.user!.id;
      const cartItemData = insertCartItemSchema.parse({
        ...req.body,
        userId
      });
      
      // Verify product exists and is available for this user
      const product = await storage.getProduct(cartItemData.productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Check membership for visibility
      if (product.visibility === "member" && !req.user!.isMember) {
        return res.status(403).json({ message: "Membership required to add this product to cart" });
      }
      
      // Check doctor visibility
      if (product.visibility === "doctor" && !req.user!.isDoctor) {
        return res.status(403).json({ message: "Doctor access required to add this product to cart" });
      }
      
      const cartItem = await storage.createCartItem(cartItemData);
      
      // Return with product details
      const itemWithProduct = {
        ...cartItem,
        product
      };
      
      res.status(201).json(itemWithProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cart item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  app.put("/api/cart/:id", isAuthenticated, async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      const { quantity } = req.body;
      
      // Verify cart item belongs to user
      const cartItem = await storage.getCartItem(cartItemId);
      
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      if (cartItem.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this cart item" });
      }
      
      const updatedCartItem = await storage.updateCartItemQuantity(cartItemId, quantity);
      
      if (!updatedCartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      // Return with product details
      const product = await storage.getProduct(updatedCartItem.productId);
      const itemWithProduct = {
        ...updatedCartItem,
        product
      };
      
      res.json(itemWithProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", isAuthenticated, async (req, res) => {
    try {
      const cartItemId = parseInt(req.params.id);
      
      // Verify cart item belongs to user
      const cartItem = await storage.getCartItem(cartItemId);
      
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      if (cartItem.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this cart item" });
      }
      
      const success = await storage.deleteCartItem(cartItemId);
      
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove item from cart" });
    }
  });

  // Order routes
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      // Regular users can only see their own orders
      // Admins can see all orders
      const userId = req.user!.isAdmin ? undefined : req.user!.id;
      const orders = await storage.getOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Users can only see their own orders unless they're an admin
      if (order.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", isMember, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      // Calculate total amount
      let totalAmount = 0;
      const orderItems = await Promise.all(
        cartItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          if (!product) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }
          
          totalAmount += product.price * item.quantity;
          
          return {
            productId: item.productId,
            name: product.name,
            price: product.price,
            quantity: item.quantity
          };
        })
      );
      
      // Create order
      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId,
        totalAmount,
        items: orderItems,
        status: "pending"
      });
      
      const order = await storage.createOrder(orderData);
      
      // Clear cart
      await storage.clearCart(userId);
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Admin order management
  app.put("/api/orders/:id/status", isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["pending", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Discount code routes
  
  // Public route - validate discount code for users
  app.post("/api/discount-codes/validate", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Discount code is required" });
      }
      
      const discountCode = await storage.getDiscountCodeByCode(code);
      
      if (!discountCode) {
        return res.status(404).json({ message: "Invalid discount code" });
      }
      
      // Check if code is active
      if (!discountCode.isActive) {
        return res.status(400).json({ message: "This discount code is no longer active" });
      }
      
      // Check if code is expired
      if (discountCode.expiresAt && new Date() > discountCode.expiresAt) {
        return res.status(400).json({ message: "This discount code has expired" });
      }
      
      // Check usage limit
      if (discountCode.usageLimit && discountCode.usedCount >= discountCode.usageLimit) {
        return res.status(400).json({ message: "This discount code has reached its usage limit" });
      }
      
      // Return discount info (without sensitive data)
      const validDiscountCode = {
        id: discountCode.id,
        code: discountCode.code,
        description: discountCode.description,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue
      };
      
      res.json({ valid: true, discountCode: validDiscountCode });
    } catch (error) {
      res.status(500).json({ message: "Failed to validate discount code" });
    }
  });
  
  // Admin routes for discount code management
  app.get("/api/discount-codes", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const discountCodes = await storage.getDiscountCodes();
      res.json(discountCodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch discount codes" });
    }
  });
  
  app.post("/api/discount-codes", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const discountCodeData = insertDiscountCodeSchema.parse(req.body);
      const discountCode = await storage.createDiscountCode(discountCodeData);
      res.status(201).json(discountCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid discount code data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create discount code" });
    }
  });
  
  app.put("/api/discount-codes/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const discountCodeId = parseInt(req.params.id);
      const discountCodeData = req.body;
      
      const updatedDiscountCode = await storage.updateDiscountCode(discountCodeId, discountCodeData);
      
      if (!updatedDiscountCode) {
        return res.status(404).json({ message: "Discount code not found" });
      }
      
      res.json(updatedDiscountCode);
    } catch (error) {
      res.status(500).json({ message: "Failed to update discount code" });
    }
  });
  
  app.delete("/api/discount-codes/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const discountCodeId = parseInt(req.params.id);
      const success = await storage.deleteDiscountCode(discountCodeId);
      
      if (!success) {
        return res.status(404).json({ message: "Discount code not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete discount code" });
    }
  });

  // Testimonial routes
  app.get("/api/testimonials", async (req, res) => {
    try {
      const { featured } = req.query;
      const testimonials = await storage.getTestimonials(
        featured === 'true' ? true : undefined
      );
      res.json(testimonials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
