// Frontend types - matches backend API responses

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  isMember: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  doctorTitle?: string | null;
  doctorSpecialty?: string | null;
  doctorBio?: string | null;
  profileImage?: string | null;
  createdAt?: string;
}

export type SelectUser = User;

export interface InsertUser {
  username: string;
  password: string;
  email: string;
  fullName: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  visibility: 'public' | 'member' | 'doctor';
  categoryId: string;
  stockQuantity: number;
  featured: boolean;
  doctorIds?: string[];
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  productCount: number;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  items: OrderItem[];
  shippingAddress: string;
  createdAt?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  content: string;
  imageUrl?: string | null;
  featured: boolean;
}

export interface DiscountCode {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive?: boolean;
}

export interface Doctor extends User {
  isDoctor: true;
}
