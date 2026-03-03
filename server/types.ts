// TypeScript types for MongoDB documents

export interface IUser {
  _id?: string;
  id?: string;
  username: string;
  password: string;
  email: string;
  fullName: string;
  isMember: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  doctorTitle?: string | null;
  doctorSpecialty?: string | null;
  doctorBio?: string | null;
  profileImage?: string | null;
  createdAt?: Date;
}

export interface IProduct {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  visibility: 'public' | 'member' | 'doctor';
  categoryId: string;
  stockQuantity: number;
  featured: boolean;
  doctorIds?: string[];
  createdAt?: Date;
}

export interface ICategory {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  productCount: number;
}

export interface IOrder {
  _id?: string;
  id?: string;
  userId: string;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  items: any;
  shippingAddress: string;
  createdAt?: Date;
}

export interface ICartItem {
  _id?: string;
  id?: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt?: Date;
}

export interface ITestimonial {
  _id?: string;
  id?: string;
  author: string;
  role: string;
  content: string;
  imageUrl?: string | null;
  featured: boolean;
}

export interface IDiscountCode {
  _id?: string;
  id?: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  usageLimit?: number | null;
  usedCount: number;
  expiresAt?: Date | null;
  createdAt?: Date;
}

// Insert types (without _id)
export type InsertUser = Omit<IUser, '_id' | 'id' | 'createdAt'>;
export type InsertProduct = Omit<IProduct, '_id' | 'id' | 'createdAt'>;
export type InsertCategory = Omit<ICategory, '_id' | 'id'>;
export type InsertOrder = Omit<IOrder, '_id' | 'id' | 'createdAt'>;
export type InsertCartItem = Omit<ICartItem, '_id' | 'id' | 'createdAt'>;
export type InsertTestimonial = Omit<ITestimonial, '_id' | 'id'>;
export type InsertDiscountCode = Omit<IDiscountCode, '_id' | 'id' | 'createdAt'>;

// Helper to transform MongoDB doc to have 'id' field
export function transformDoc<T extends { _id?: any }>(doc: T | null): (Omit<T, '_id'> & { id: string }) | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id?.toString() || '' } as any;
}

export function transformDocs<T extends { _id?: any }>(docs: T[]): (Omit<T, '_id'> & { id: string })[] {
  return docs.map(doc => transformDoc(doc)!).filter(Boolean);
}
