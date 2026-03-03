import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  isMember: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isDoctor: { type: Boolean, default: false },
  doctorTitle: { type: String, default: null },
  doctorSpecialty: { type: String, default: null },
  doctorBio: { type: String, default: null },
  profileImage: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }, // Price in cents
  imageUrl: { type: String, default: null },
  visibility: { type: String, required: true, enum: ['public', 'member', 'doctor'] },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  stockQuantity: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  doctorIds: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, default: null },
  productCount: { type: Number, default: 0 }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmount: { type: Number, required: true }, // Total in cents
  status: { type: String, required: true, enum: ['pending', 'completed', 'cancelled'] },
  items: { type: mongoose.Schema.Types.Mixed, required: true },
  shippingAddress: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// CartItem Schema
const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

// Testimonial Schema
const testimonialSchema = new mongoose.Schema({
  author: { type: String, required: true },
  role: { type: String, required: true },
  content: { type: String, required: true },
  imageUrl: { type: String, default: null },
  featured: { type: Boolean, default: false }
});

// DiscountCode Schema
const discountCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  discountType: { type: String, required: true, enum: ['percentage', 'fixed'] },
  discountValue: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Create models
export const User = mongoose.model('User', userSchema);
export const Product = mongoose.model('Product', productSchema);
export const Category = mongoose.model('Category', categorySchema);
export const Order = mongoose.model('Order', orderSchema);
export const CartItem = mongoose.model('CartItem', cartItemSchema);
export const Testimonial = mongoose.model('Testimonial', testimonialSchema);
export const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);
