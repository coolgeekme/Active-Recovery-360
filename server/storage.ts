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
  InsertTestimonial
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  getDoctors(): Promise<User[]>;
  getDoctor(id: number): Promise<User | undefined>;

  // Product operations
  getProducts(filters?: { 
    visibility?: string; 
    categoryId?: number; 
    featured?: boolean;
    doctorId?: number;
  }): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined>;

  // Order operations
  getOrders(userId?: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Cart operations
  getCartItems(userId: number): Promise<CartItem[]>;
  getCartItem(id: number): Promise<CartItem | undefined>;
  createCartItem(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined>;
  deleteCartItem(id: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;

  // Testimonial operations
  getTestimonials(featured?: boolean): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;

  // Session store
  sessionStore: any; // Using any for now to avoid sessionStore type issues
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private categories: Map<number, Category>;
  private orders: Map<number, Order>;
  private cartItems: Map<number, CartItem>;
  private testimonials: Map<number, Testimonial>;
  currentUserId: number;
  currentProductId: number;
  currentCategoryId: number;
  currentOrderId: number;
  currentCartItemId: number;
  currentTestimonialId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.categories = new Map();
    this.orders = new Map();
    this.cartItems = new Map();
    this.testimonials = new Map();
    
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentCategoryId = 1;
    this.currentOrderId = 1;
    this.currentCartItemId = 1;
    this.currentTestimonialId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });

    // Initialize some test data
    this.initializeData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      isMember: false,
      isAdmin: false,
      createdAt
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getDoctors(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isDoctor);
  }

  async getDoctor(id: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (user && user.isDoctor) {
      return user;
    }
    return undefined;
  }

  // Product methods
  async getProducts(filters?: { 
    visibility?: string; 
    categoryId?: number; 
    featured?: boolean;
    doctorId?: number;
  }): Promise<Product[]> {
    let filteredProducts = Array.from(this.products.values());
    
    if (filters) {
      if (filters.visibility) {
        filteredProducts = filteredProducts.filter(p => p.visibility === filters.visibility);
      }
      
      if (filters.categoryId) {
        filteredProducts = filteredProducts.filter(p => p.categoryId === filters.categoryId);
      }
      
      if (filters.featured !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.featured === filters.featured);
      }

      if (filters.doctorId !== undefined) {
        filteredProducts = filteredProducts.filter(p => 
          p.doctorIds && p.doctorIds.includes(filters.doctorId!.toString())
        );
      }
    }
    
    return filteredProducts;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const createdAt = new Date();
    const product: Product = { ...insertProduct, id, createdAt };
    this.products.set(id, product);
    
    // Update product count for category
    const category = await this.getCategory(product.categoryId);
    if (category) {
      await this.updateCategory(category.id, { 
        productCount: category.productCount + 1 
      });
    }
    
    return product;
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updatedProduct = { ...product, ...productData };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) return false;
    
    // Update product count for category
    const category = await this.getCategory(product.categoryId);
    if (category) {
      await this.updateCategory(category.id, { 
        productCount: Math.max(0, category.productCount - 1) 
      });
    }
    
    return this.products.delete(id);
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;

    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  // Order methods
  async getOrders(userId?: number): Promise<Order[]> {
    let allOrders = Array.from(this.orders.values());
    if (userId) {
      return allOrders.filter(order => order.userId === userId);
    }
    return allOrders;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const createdAt = new Date();
    const order: Order = { ...insertOrder, id, createdAt };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Cart methods
  async getCartItems(userId: number): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(
      item => item.userId === userId
    );
  }

  async getCartItem(id: number): Promise<CartItem | undefined> {
    return this.cartItems.get(id);
  }

  async createCartItem(insertCartItem: InsertCartItem): Promise<CartItem> {
    // Check if item is already in cart
    const existingItems = await this.getCartItems(insertCartItem.userId);
    const existingItem = existingItems.find(
      item => item.productId === insertCartItem.productId
    );
    
    if (existingItem) {
      // Update quantity instead of creating new item
      return this.updateCartItemQuantity(
        existingItem.id, 
        existingItem.quantity + insertCartItem.quantity
      ) as Promise<CartItem>;
    }
    
    const id = this.currentCartItemId++;
    const createdAt = new Date();
    const cartItem: CartItem = { ...insertCartItem, id, createdAt };
    this.cartItems.set(id, cartItem);
    return cartItem;
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    const cartItem = this.cartItems.get(id);
    if (!cartItem) return undefined;

    const updatedCartItem = { ...cartItem, quantity };
    this.cartItems.set(id, updatedCartItem);
    return updatedCartItem;
  }

  async deleteCartItem(id: number): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async clearCart(userId: number): Promise<boolean> {
    const userCartItems = await this.getCartItems(userId);
    for (const item of userCartItems) {
      this.cartItems.delete(item.id);
    }
    return true;
  }

  // Testimonial methods
  async getTestimonials(featured?: boolean): Promise<Testimonial[]> {
    let allTestimonials = Array.from(this.testimonials.values());
    if (featured !== undefined) {
      return allTestimonials.filter(t => t.featured === featured);
    }
    return allTestimonials;
  }

  async createTestimonial(insertTestimonial: InsertTestimonial): Promise<Testimonial> {
    const id = this.currentTestimonialId++;
    const testimonial: Testimonial = { ...insertTestimonial, id };
    this.testimonials.set(id, testimonial);
    return testimonial;
  }

  // Initialize sample data for development
  private async initializeData() {
    // Sample categories
    const categories = [
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

    for (const category of categories) {
      await this.createCategory(category);
    }

    // Sample testimonials
    const testimonials = [
      {
        author: "Dr. Karen Miller",
        role: "Physical Therapist",
        content: "The Exercise Recovery Alliance has transformed how I treat my patients. The professional-grade products available through the membership are superior to anything I've used before.",
        imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
        featured: true
      },
      {
        author: "James Wilson",
        role: "Professional Athlete",
        content: "The member-only products have been instrumental in my recovery from a serious knee injury. I couldn't have made such quick progress without these specialized tools.",
        imageUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
        featured: true
      },
      {
        author: "Dr. Robert Thompson",
        role: "Sports Medicine Clinic",
        content: "As a clinic owner, I appreciate having access to the doctor-specific products. The quality and efficacy of these tools have made a noticeable difference in our patient outcomes.",
        imageUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
        featured: true
      }
    ];

    for (const testimonial of testimonials) {
      await this.createTestimonial(testimonial);
    }
  }
}

import { DatabaseStorage } from './database-storage';

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
