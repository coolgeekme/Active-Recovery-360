import bcrypt from 'bcrypt';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { User, Product, Category, Order, CartItem, Testimonial, DiscountCode } from './models';
import { connectDB, mongoose } from './db';
import { transformDoc, transformDocs } from './types';

export interface IStorage {
  sessionStore: session.Store;
  init(): Promise<void>;
  
  // User operations
  getUser(id: string): Promise<any>;
  getUsers(): Promise<any[]>;
  getUserByUsername(username: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  createUser(userData: any): Promise<any>;
  updateUser(id: string, userData: any): Promise<any>;
  getDoctors(): Promise<any[]>;
  getDoctor(id: string): Promise<any>;
  
  // Product operations
  getProducts(filters?: any): Promise<any[]>;
  getProduct(id: string): Promise<any>;
  createProduct(productData: any): Promise<any>;
  updateProduct(id: string, productData: any): Promise<any>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Category operations
  getCategories(): Promise<any[]>;
  getCategory(id: string): Promise<any>;
  createCategory(categoryData: any): Promise<any>;
  updateCategory(id: string, categoryData: any): Promise<any>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Order operations
  getOrders(userId?: string): Promise<any[]>;
  getOrder(id: string): Promise<any>;
  createOrder(orderData: any): Promise<any>;
  updateOrderStatus(id: string, status: string): Promise<any>;
  
  // Cart operations
  getCartItems(userId: string): Promise<any[]>;
  getCartItem(id: string): Promise<any>;
  createCartItem(cartItemData: any): Promise<any>;
  updateCartItemQuantity(id: string, quantity: number): Promise<any>;
  deleteCartItem(id: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;
  
  // Testimonial operations
  getTestimonials(featured?: boolean): Promise<any[]>;
  createTestimonial(testimonialData: any): Promise<any>;
  
  // Discount code operations
  getDiscountCodes(): Promise<any[]>;
  getDiscountCode(id: string): Promise<any>;
  getDiscountCodeByCode(code: string): Promise<any>;
  createDiscountCode(discountCodeData: any): Promise<any>;
  updateDiscountCode(id: string, data: any): Promise<any>;
  deleteDiscountCode(id: string): Promise<boolean>;
  incrementDiscountCodeUsage(id: string): Promise<any>;
}

export class MongoStorage implements IStorage {
  private initialized = false;
  public sessionStore: session.Store;

  constructor() {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/ar360';
    this.sessionStore = MongoStore.create({
      mongoUrl,
      collectionName: 'sessions',
      ttl: 30 * 24 * 60 * 60, // 30 days
    });
  }

  async init() {
    if (this.initialized) return;
    await connectDB();
    await this.initializeData();
    this.initialized = true;
  }

  // Password hashing
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    return bcrypt.compare(supplied, stored);
  }

  // User operations
  async getUser(id: string) {
    const doc = await User.findById(id).lean();
    return transformDoc(doc);
  }

  async getUsers() {
    const docs = await User.find().lean();
    return transformDocs(docs);
  }

  async getUserByUsername(username: string) {
    const doc = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).lean();
    return transformDoc(doc);
  }

  async getUserByEmail(email: string) {
    const doc = await User.findOne({ email }).lean();
    return transformDoc(doc);
  }

  async createUser(userData: any) {
    const user = new User(userData);
    await user.save();
    return transformDoc(user.toObject());
  }

  async updateUser(id: string, userData: any) {
    const doc = await User.findByIdAndUpdate(id, userData, { new: true }).lean();
    return transformDoc(doc);
  }

  async getDoctors() {
    const docs = await User.find({ isDoctor: true }).lean();
    return transformDocs(docs);
  }

  async getDoctor(id: string) {
    const doc = await User.findOne({ _id: id, isDoctor: true }).lean();
    return transformDoc(doc);
  }

  // Product operations
  async getProducts(filters?: { visibility?: string; categoryId?: string; featured?: boolean; doctorId?: string }) {
    const query: any = {};
    
    if (filters) {
      if (filters.visibility) query.visibility = filters.visibility;
      if (filters.categoryId) query.categoryId = filters.categoryId;
      if (filters.featured !== undefined) query.featured = filters.featured;
      if (filters.doctorId) query.doctorIds = filters.doctorId;
    }
    
    const docs = await Product.find(query).lean();
    return transformDocs(docs);
  }

  async getProduct(id: string) {
    const doc = await Product.findById(id).lean();
    return transformDoc(doc);
  }

  async createProduct(productData: any) {
    const product = new Product(productData);
    await product.save();
    
    // Update category product count
    if (product.categoryId) {
      await Category.findByIdAndUpdate(product.categoryId, { $inc: { productCount: 1 } });
    }
    
    return transformDoc(product.toObject());
  }

  async updateProduct(id: string, productData: any) {
    const oldProduct = await Product.findById(id);
    const doc = await Product.findByIdAndUpdate(id, productData, { new: true }).lean();
    
    // Update category counts if category changed
    if (oldProduct && doc && oldProduct.categoryId?.toString() !== productData.categoryId?.toString()) {
      if (oldProduct.categoryId) {
        await Category.findByIdAndUpdate(oldProduct.categoryId, { $inc: { productCount: -1 } });
      }
      if (productData.categoryId) {
        await Category.findByIdAndUpdate(productData.categoryId, { $inc: { productCount: 1 } });
      }
    }
    
    return transformDoc(doc);
  }

  async deleteProduct(id: string) {
    const product = await Product.findById(id);
    if (!product) return false;
    
    if (product.categoryId) {
      await Category.findByIdAndUpdate(product.categoryId, { $inc: { productCount: -1 } });
    }
    
    await Product.findByIdAndDelete(id);
    return true;
  }

  // Category operations
  async getCategories() {
    const docs = await Category.find().lean();
    return transformDocs(docs);
  }

  async getCategory(id: string) {
    const doc = await Category.findById(id).lean();
    return transformDoc(doc);
  }

  async createCategory(categoryData: any) {
    const category = new Category(categoryData);
    await category.save();
    return transformDoc(category.toObject());
  }

  async updateCategory(id: string, categoryData: any) {
    const doc = await Category.findByIdAndUpdate(id, categoryData, { new: true }).lean();
    return transformDoc(doc);
  }

  async deleteCategory(id: string) {
    await Category.findByIdAndDelete(id);
    return true;
  }

  // Order operations
  async getOrders(userId?: string) {
    if (userId) {
      const docs = await Order.find({ userId }).lean();
      return transformDocs(docs);
    }
    const docs = await Order.find().lean();
    return transformDocs(docs);
  }

  async getOrder(id: string) {
    const doc = await Order.findById(id).lean();
    return transformDoc(doc);
  }

  async createOrder(orderData: any) {
    const order = new Order(orderData);
    await order.save();
    return transformDoc(order.toObject());
  }

  async updateOrderStatus(id: string, status: string) {
    const doc = await Order.findByIdAndUpdate(id, { status }, { new: true }).lean();
    return transformDoc(doc);
  }

  // Cart operations
  async getCartItems(userId: string) {
    const docs = await CartItem.find({ userId }).lean();
    return transformDocs(docs);
  }

  async getCartItem(id: string) {
    const doc = await CartItem.findById(id).lean();
    return transformDoc(doc);
  }

  async createCartItem(cartItemData: any) {
    // Check if item already exists in cart
    const existingItem = await CartItem.findOne({
      userId: cartItemData.userId,
      productId: cartItemData.productId
    });
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + (cartItemData.quantity || 1);
      return this.updateCartItemQuantity(existingItem._id.toString(), newQuantity);
    }
    
    const cartItem = new CartItem({
      ...cartItemData,
      quantity: cartItemData.quantity || 1
    });
    await cartItem.save();
    return transformDoc(cartItem.toObject());
  }

  async updateCartItemQuantity(id: string, quantity: number) {
    const doc = await CartItem.findByIdAndUpdate(id, { quantity }, { new: true }).lean();
    return transformDoc(doc);
  }

  async deleteCartItem(id: string) {
    await CartItem.findByIdAndDelete(id);
    return true;
  }

  async clearCart(userId: string) {
    await CartItem.deleteMany({ userId });
    return true;
  }

  // Testimonial operations
  async getTestimonials(featured?: boolean) {
    if (featured !== undefined) {
      const docs = await Testimonial.find({ featured }).lean();
      return transformDocs(docs);
    }
    const docs = await Testimonial.find().lean();
    return transformDocs(docs);
  }

  async createTestimonial(testimonialData: any) {
    const testimonial = new Testimonial(testimonialData);
    await testimonial.save();
    return transformDoc(testimonial.toObject());
  }

  // Discount code operations
  async getDiscountCodes() {
    const docs = await DiscountCode.find().sort({ createdAt: 1 }).lean();
    return transformDocs(docs);
  }

  async getDiscountCode(id: string) {
    const doc = await DiscountCode.findById(id).lean();
    return transformDoc(doc);
  }

  async getDiscountCodeByCode(code: string) {
    const doc = await DiscountCode.findOne({ code: code.toUpperCase() }).lean();
    return transformDoc(doc);
  }

  async createDiscountCode(discountCodeData: any) {
    const discountCode = new DiscountCode({
      ...discountCodeData,
      code: discountCodeData.code.toUpperCase()
    });
    await discountCode.save();
    return transformDoc(discountCode.toObject());
  }

  async updateDiscountCode(id: string, data: any) {
    const doc = await DiscountCode.findByIdAndUpdate(id, data, { new: true }).lean();
    return transformDoc(doc);
  }

  async deleteDiscountCode(id: string) {
    await DiscountCode.findByIdAndDelete(id);
    return true;
  }

  async incrementDiscountCodeUsage(id: string) {
    const doc = await DiscountCode.findByIdAndUpdate(id, { $inc: { usedCount: 1 } }, { new: true }).lean();
    return transformDoc(doc);
  }

  // Initialize sample data
  async initializeData() {
    // Check if data already exists
    const userCount = await User.countDocuments();
    
    // Create Kevin MacPherson admin if not exists
    const kevinUser = await this.getUserByEmail("kevinmacpherson08@gmail.com");
    if (!kevinUser) {
      console.log("Creating Kevin MacPherson admin user");
      const kevinHashedPassword = await this.hashPassword("Recovery25!");
      await this.createUser({
        username: "kevinmacpherson08",
        password: kevinHashedPassword,
        email: "kevinmacpherson08@gmail.com",
        fullName: "Kevin MacPherson",
        isAdmin: true,
        isMember: true,
        isDoctor: false
      });
      console.log("Kevin MacPherson admin user created successfully");
    }

    if (userCount > 1) {
      console.log("Database already has data, skipping full initialization");
      return;
    }

    console.log("Initializing database with sample data");

    // Create admin user
    const adminHashedPassword = await this.hashPassword("password");
    const admin = await this.createUser({
      username: "admin",
      password: adminHashedPassword,
      email: "admin@example.com",
      fullName: "Admin User",
      isAdmin: true,
      isMember: true,
      isDoctor: false
    });

    // Create doctor user
    const doctor = await this.createUser({
      username: "doctor",
      password: adminHashedPassword,
      email: "doctor@example.com",
      fullName: "Dr. Jane Smith",
      isAdmin: false,
      isMember: true,
      isDoctor: true,
      doctorTitle: "MD, PT",
      doctorSpecialty: "Sports Medicine, Rehabilitation",
      doctorBio: "Specializing in sports injuries and rehabilitation techniques for athletes of all levels."
    });

    // Create categories
    const categoriesData = [
      { name: "Hot/Cold Therapy", description: "Hot and cold therapy products for recovery", imageUrl: "https://images.unsplash.com/photo-1554344728-77cf90d9ed26?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Topicals", description: "Topical recovery products and treatments", imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Electro Therapy", description: "Electro therapy devices and equipment", imageUrl: "https://images.unsplash.com/photo-1547919307-1ecb10702e6f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Self-Care Tools", description: "Self-care tools for recovery and wellness", imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Recovery Garments", description: "Recovery garments and apparel", imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Compression Therapy", description: "Compression therapy products for recovery", imageUrl: "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Recovery Patches", description: "Recovery patches for targeted relief", imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Kinesiology Tape", description: "Kinesiology tape for support and recovery", imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 },
      { name: "Braces", description: "Braces and supports for injury recovery", imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80", productCount: 0 }
    ];

    const createdCategories: any[] = [];
    for (const categoryData of categoriesData) {
      const category = await this.createCategory(categoryData);
      createdCategories.push(category);
    }

    // Create products
    const productsData = [
      { name: "Professional Recovery Bands Set", description: "Set of 5 professional-grade resistance bands with varying tensions for targeted muscle recovery.", price: 3995, visibility: "public", categoryId: createdCategories[3].id, stockQuantity: 50, featured: true, imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b", doctorIds: [doctor.id] },
      { name: "Joint Mobility Kit", description: "Complete kit for joint mobility including resistance tools and guided exercise program.", price: 7995, visibility: "member", categoryId: createdCategories[3].id, stockQuantity: 30, featured: true, imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a" },
      { name: "Premium Posture Corrector", description: "Medical-grade posture correction system with smart sensor technology.", price: 12995, visibility: "public", categoryId: createdCategories[4].id, stockQuantity: 40, featured: true, imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b" },
      { name: "Therapeutic Back Support System", description: "Professional-grade back support system with heat therapy integration.", price: 18995, visibility: "doctor", categoryId: createdCategories[4].id, stockQuantity: 15, featured: false, imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b", doctorIds: [doctor.id] },
      { name: "Advanced Compression Sleeves", description: "Set of compression sleeves for arms and legs with graduated pressure technology.", price: 4995, visibility: "public", categoryId: createdCategories[5].id, stockQuantity: 60, featured: true, imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b" },
      { name: "Professional Compression System", description: "Full-body compression therapy system for enhanced recovery and circulation.", price: 29995, visibility: "doctor", categoryId: createdCategories[5].id, stockQuantity: 10, featured: false, imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b", doctorIds: [doctor.id] },
      { name: "Digital Heat Therapy Wrap", description: "Smart heat therapy wrap with digital temperature control and timer.", price: 8995, visibility: "public", categoryId: createdCategories[0].id, stockQuantity: 45, featured: true, imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b" },
      { name: "Professional Cold Therapy Unit", description: "Medical-grade cold therapy system with continuous flow technology.", price: 24995, visibility: "member", categoryId: createdCategories[0].id, stockQuantity: 20, featured: true, imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b" },
      { name: "Contrast Therapy System", description: "Advanced system combining both heat and cold therapy with digital controls.", price: 34995, visibility: "doctor", categoryId: createdCategories[0].id, stockQuantity: 15, featured: false, imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b", doctorIds: [doctor.id] }
    ];

    for (const productData of productsData) {
      await this.createProduct(productData);
    }

    // Create testimonials
    const testimonialsData = [
      { author: "Dr. Karen Miller", role: "Physical Therapist", content: "Active Recovery 360 offers products that match what we use in our clinic. I recommend these to all my patients for continued care at home.", featured: true },
      { author: "Michael Johnson", role: "Professional Athlete", content: "Since becoming a member, I've had access to recovery tools that have significantly reduced my injury recovery time. Well worth the membership fee!", featured: true },
      { author: "Sarah Thomson", role: "Yoga Instructor", content: "I recommend Active Recovery 360 to all my yoga students. The quality of their products and the educational resources are exceptional.", featured: true }
    ];

    for (const testimonialData of testimonialsData) {
      await this.createTestimonial(testimonialData);
    }

    console.log("Database initialization complete");
  }
}

export const storage = new MongoStorage();
