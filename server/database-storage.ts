import { 
  users, 
  User, 
  InsertUser, 
  products,
  Product,
  InsertProduct,
  categories,
  Category,
  InsertCategory,
  orders,
  Order,
  InsertOrder,
  cartItems,
  CartItem,
  InsertCartItem,
  testimonials,
  Testimonial,
  InsertTestimonial,
  discountCodes,
  DiscountCode,
  InsertDiscountCode
} from "@shared/schema";
import session from "express-session";
import { eq, and, inArray, or, like, asc, desc } from 'drizzle-orm';
import { db, pool } from './db';
import connectPg from "connect-pg-simple";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any to avoid type issues

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Seed data if needed
    this.initializeData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getDoctors(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isDoctor, true));
  }

  async getDoctor(id: number): Promise<User | undefined> {
    const [doctor] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.isDoctor, true)));
    return doctor;
  }

  // Product operations
  async getProducts(filters?: { 
    visibility?: string; 
    categoryId?: number; 
    featured?: boolean;
    doctorId?: number;
  }): Promise<Product[]> {
    // Log the filters being applied
    console.log("Product filters:", filters);
    
    // First try to get all products to see if we're getting data
    const allProducts = await db.select().from(products);
    console.log(`Total products in database: ${allProducts.length}`);
    
    // Now build the query with filters
    let query = db.select().from(products);
    
    const conditions = [];
    
    if (filters) {
      if (filters.visibility) {
        console.log(`Filtering by visibility: ${filters.visibility}`);
        conditions.push(eq(products.visibility, filters.visibility));
      }
      
      if (filters.categoryId !== undefined) {
        console.log(`Filtering by categoryId: ${filters.categoryId}`);
        conditions.push(eq(products.categoryId, filters.categoryId));
      }
      
      if (filters.featured !== undefined) {
        console.log(`Filtering by featured: ${filters.featured}`);
        conditions.push(eq(products.featured, filters.featured));
      }
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query;
    console.log(`Results after SQL filtering: ${results.length}`);
    
    // Filter by doctorId if needed
    // Since doctorIds is a JSON field, we need to filter in memory
    if (filters?.doctorId !== undefined) {
      console.log(`Filtering by doctorId: ${filters.doctorId}`);
      const filteredResults = results.filter(product => {
        if (!product.doctorIds) return false;
        return product.doctorIds.includes(filters.doctorId!.toString());
      });
      console.log(`Results after doctorId filtering: ${filteredResults.length}`);
      return filteredResults;
    }
    
    return results;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    
    // Update category product count
    if (product.categoryId) {
      const category = await this.getCategory(product.categoryId);
      if (category) {
        await this.updateCategory(category.id, {
          productCount: category.productCount + 1
        });
      }
    }
    
    return product;
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    // If categoryId is changing, update both old and new category product counts
    const oldProduct = await this.getProduct(id);
    const oldCategoryId = oldProduct?.categoryId;
    const newCategoryId = productData.categoryId;
    
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, id))
      .returning();
      
    if (updatedProduct && oldCategoryId !== newCategoryId && oldCategoryId && newCategoryId) {
      // Update old category count
      const oldCategory = await this.getCategory(oldCategoryId);
      if (oldCategory) {
        await this.updateCategory(oldCategory.id, {
          productCount: Math.max(0, oldCategory.productCount - 1)
        });
      }
      
      // Update new category count
      const newCategory = await this.getCategory(newCategoryId);
      if (newCategory) {
        await this.updateCategory(newCategory.id, {
          productCount: newCategory.productCount + 1
        });
      }
    }
    
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const product = await this.getProduct(id);
    if (!product) return false;
    
    // Update category product count
    if (product.categoryId) {
      const category = await this.getCategory(product.categoryId);
      if (category) {
        await this.updateCategory(category.id, {
          productCount: Math.max(0, category.productCount - 1)
        });
      }
    }
    
    await db.delete(products).where(eq(products.id, id));
    return true;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  // Order operations
  async getOrders(userId?: number): Promise<Order[]> {
    if (userId !== undefined) {
      return db.select().from(orders).where(eq(orders.userId, userId));
    }
    return db.select().from(orders);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Cart operations
  async getCartItems(userId: number): Promise<CartItem[]> {
    return db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async getCartItem(id: number): Promise<CartItem | undefined> {
    const [cartItem] = await db.select().from(cartItems).where(eq(cartItems.id, id));
    return cartItem;
  }

  async createCartItem(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item is already in cart
    const existingItems = await this.getCartItems(insertCartItem.userId);
    const existingItem = existingItems.find(
      item => item.productId === insertCartItem.productId
    );
    
    if (existingItem) {
      // Update quantity instead of creating new item
      const quantity = existingItem.quantity + (insertCartItem.quantity || 1);
      return this.updateCartItemQuantity(
        existingItem.id, 
        quantity
      ) as Promise<CartItem>;
    }
    
    // Ensure quantity has a default value if not provided
    const cartItemToInsert = {
      ...insertCartItem,
      quantity: insertCartItem.quantity || 1
    };
    
    const [cartItem] = await db.insert(cartItems).values(cartItemToInsert).returning();
    return cartItem;
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    const [updatedCartItem] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updatedCartItem;
  }

  async deleteCartItem(id: number): Promise<boolean> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
    return true;
  }

  async clearCart(userId: number): Promise<boolean> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return true;
  }

  // Testimonial operations
  async getTestimonials(featured?: boolean): Promise<Testimonial[]> {
    if (featured !== undefined) {
      return db.select().from(testimonials).where(eq(testimonials.featured, featured));
    }
    return db.select().from(testimonials);
  }

  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db.insert(testimonials).values(insertTestimonial).returning();
    return testimonial;
  }

  // Discount code operations
  async getDiscountCodes(): Promise<DiscountCode[]> {
    return db.select().from(discountCodes).orderBy(asc(discountCodes.createdAt));
  }

  async getDiscountCode(id: number): Promise<DiscountCode | undefined> {
    const [discountCode] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
    return discountCode;
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const [discountCode] = await db.select().from(discountCodes).where(eq(discountCodes.code, code.toUpperCase()));
    return discountCode;
  }

  async createDiscountCode(insertDiscountCode: InsertDiscountCode): Promise<DiscountCode> {
    const codeToInsert = {
      ...insertDiscountCode,
      code: insertDiscountCode.code.toUpperCase() // Ensure codes are uppercase
    };
    const [discountCode] = await db.insert(discountCodes).values(codeToInsert).returning();
    return discountCode;
  }

  async updateDiscountCode(id: number, data: Partial<DiscountCode>): Promise<DiscountCode | undefined> {
    const [updatedDiscountCode] = await db
      .update(discountCodes)
      .set(data)
      .where(eq(discountCodes.id, id))
      .returning();
    return updatedDiscountCode;
  }

  async deleteDiscountCode(id: number): Promise<boolean> {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
    return true;
  }

  async incrementDiscountCodeUsage(id: number): Promise<DiscountCode | undefined> {
    const [updatedDiscountCode] = await db
      .update(discountCodes)
      .set({ usedCount: db.sql`${discountCodes.usedCount} + 1` })
      .where(eq(discountCodes.id, id))
      .returning();
    return updatedDiscountCode;
  }

  private async initializeData() {
    // Check if we already have data
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping initialization");
      return;
    }

    console.log("Initializing database with sample data");

    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "$2b$10$zQSMUMg1R1TYxCG4QKmr0.6HGTToPv0qAMTNOYOVS.eXJYm4hlxLW", // "password"
      email: "admin@example.com",
      fullName: "Admin User",
      isAdmin: true,
      isMember: true,
      isDoctor: false,
    };
    const admin = await this.createUser(adminUser);

    // Create doctor user
    const doctorUser: InsertUser = {
      username: "doctor",
      password: "$2b$10$zQSMUMg1R1TYxCG4QKmr0.6HGTToPv0qAMTNOYOVS.eXJYm4hlxLW", // "password"
      email: "doctor@example.com",
      fullName: "Dr. Jane Smith",
      isAdmin: false,
      isMember: true,
      isDoctor: true,
      doctorTitle: "MD, PT",
      doctorSpecialty: "Sports Medicine, Rehabilitation",
      doctorBio: "Specializing in sports injuries and rehabilitation techniques for athletes of all levels."
    };
    const doctor = await this.createUser(doctorUser);

    // Create regular user
    const regularUser: InsertUser = {
      username: "user",
      password: "$2b$10$zQSMUMg1R1TYxCG4QKmr0.6HGTToPv0qAMTNOYOVS.eXJYm4hlxLW", // "password"
      email: "user@example.com",
      fullName: "Regular User",
      isAdmin: false,
      isMember: false,
      isDoctor: false,
    };
    const user = await this.createUser(regularUser);

    // Sample categories
    const categoriesData = [
      {
        name: "Joint & Muscle",
        description: "Products for joint and muscle recovery",
        imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        productCount: 0
      },
      {
        name: "Spine & Back",
        description: "Products for spine and back recovery",
        imageUrl: "https://images.unsplash.com/photo-1547919307-1ecb10702e6f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        productCount: 0
      },
      {
        name: "Compression Therapy",
        description: "Compression products for recovery",
        imageUrl: "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        productCount: 0
      },
      {
        name: "Heat & Cold Therapy",
        description: "Heat and cold therapy products",
        imageUrl: "https://images.unsplash.com/photo-1554344728-77cf90d9ed26?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        productCount: 0
      }
    ];

    const createdCategories = [];
    for (const categoryData of categoriesData) {
      const category = await this.createCategory(categoryData);
      createdCategories.push(category);
    }

    // Sample products
    const productsData = [
      // Joint & Muscle Category
      {
        name: "Professional Recovery Bands Set",
        description: "Set of 5 professional-grade resistance bands with varying tensions for targeted muscle recovery and joint mobility exercises.",
        price: 3995, // $39.95
        visibility: "public",
        categoryId: createdCategories[0].id,
        stockQuantity: 50,
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
        doctorIds: [doctor.id.toString()]
      },
      {
        name: "Joint Mobility Kit",
        description: "Complete kit for joint mobility including resistance tools and guided exercise program.",
        price: 7995,
        visibility: "member",
        categoryId: createdCategories[0].id,
        stockQuantity: 30,
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a"
      },
      
      // Spine & Back Category
      {
        name: "Premium Posture Corrector",
        description: "Medical-grade posture correction system with smart sensor technology.",
        price: 12995,
        visibility: "public",
        categoryId: createdCategories[1].id,
        stockQuantity: 40,
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b"
      },
      {
        name: "Therapeutic Back Support System",
        description: "Professional-grade back support system with heat therapy integration.",
        price: 18995,
        visibility: "doctor",
        categoryId: createdCategories[1].id,
        stockQuantity: 15,
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
        doctorIds: [doctor.id.toString()]
      },
      
      // Compression Therapy Category
      {
        name: "Advanced Compression Sleeves",
        description: "Set of compression sleeves for arms and legs with graduated pressure technology.",
        price: 4995,
        visibility: "public",
        categoryId: createdCategories[2].id,
        stockQuantity: 60,
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b"
      },
      {
        name: "Professional Compression System",
        description: "Full-body compression therapy system for enhanced recovery and circulation.",
        price: 29995,
        visibility: "doctor",
        categoryId: createdCategories[2].id,
        stockQuantity: 10,
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
        doctorIds: [doctor.id.toString()]
      },
      
      // Heat & Cold Therapy Category
      {
        name: "Digital Heat Therapy Wrap",
        description: "Smart heat therapy wrap with digital temperature control and timer.",
        price: 8995,
        visibility: "public",
        categoryId: createdCategories[3].id,
        stockQuantity: 45,
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b"
      },
      {
        name: "Professional Cold Therapy Unit",
        description: "Medical-grade cold therapy system with continuous flow technology.",
        price: 24995,
        visibility: "member",
        categoryId: createdCategories[3].id,
        stockQuantity: 20,
        featured: true,
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b"
      },
      {
        name: "Contrast Therapy System",
        description: "Advanced system combining both heat and cold therapy with digital controls.",
        price: 34995,
        visibility: "doctor",
        categoryId: createdCategories[3].id,
        stockQuantity: 15,
        featured: false,
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
        doctorIds: [doctor.id.toString()]
      }
    ];

    for (const productData of productsData) {
      await this.createProduct(productData);
    }

    // Sample testimonials
    const testimonialsData = [
      {
        author: "Dr. Karen Miller",
        role: "Physical Therapist",
        content: "Active Recovery 360 offers products that match what we use in our clinic. I recommend these to all my patients for continued care at home.",
        rating: 5,
        featured: true
      },
      {
        author: "Michael Johnson",
        role: "Professional Athlete",
        content: "Since becoming a member, I've had access to recovery tools that have significantly reduced my injury recovery time. Well worth the membership fee!",
        rating: 5,
        featured: true
      },
      {
        author: "Sarah Thomson",
        role: "Yoga Instructor",
        content: "I recommend Active Recovery 360 to all my yoga students. The quality of their products and the educational resources are exceptional.",
        rating: 4,
        featured: true
      },
    ];

    for (const testimonialData of testimonialsData) {
      await this.createTestimonial(testimonialData);
    }
  }
}