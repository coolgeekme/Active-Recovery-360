from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

# User Models
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str = Field(alias="fullName")
    is_member: bool = Field(default=False, alias="isMember")
    is_admin: bool = Field(default=False, alias="isAdmin")
    is_doctor: bool = Field(default=False, alias="isDoctor")
    doctor_title: Optional[str] = Field(default=None, alias="doctorTitle")
    doctor_specialty: Optional[str] = Field(default=None, alias="doctorSpecialty")
    doctor_bio: Optional[str] = Field(default=None, alias="doctorBio")
    profile_image: Optional[str] = Field(default=None, alias="profileImage")

    class Config:
        populate_by_name = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str = Field(alias="fullName")
    # HCP fields (optional for regular users)
    is_hcp_application: bool = Field(default=False, alias="isHcpApplication")
    license_number: Optional[str] = Field(default=None, alias="licenseNumber")
    specialty: Optional[str] = Field(default=None)

    class Config:
        populate_by_name = True

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(alias="newPassword")
    
    class Config:
        populate_by_name = True

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    class Config:
        populate_by_name = True

# Product Variant Model
class ProductVariant(BaseModel):
    sku: str
    name: str  # Display name like "Size M" or "Black - Large"
    price: int
    stock_quantity: int = Field(default=0, alias="stockQuantity")
    attributes: dict = {}  # e.g., {"size": "M", "color": "Grey"}
    
    class Config:
        populate_by_name = True

# Product Models
class ProductBase(BaseModel):
    name: str
    description: str
    price: int  # Base price (or price of first variant)
    image_url: Optional[str] = Field(default=None, alias="imageUrl")
    visibility: str = "public"
    category_ids: List[str] = Field(default=[], alias="categoryIds")
    stock_quantity: int = Field(default=0, alias="stockQuantity")
    featured: bool = False
    doctor_ids: List[str] = Field(default=[], alias="doctorIds")
    brand: Optional[str] = None
    variants: List[ProductVariant] = []  # Empty for simple products
    has_variants: bool = Field(default=False, alias="hasVariants")
    hide_price: bool = Field(default=False, alias="hidePrice")  # Provider-only pricing: product visible, price hidden from non-HCP

    class Config:
        populate_by_name = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: str
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    class Config:
        populate_by_name = True

# Category Models
class CategoryBase(BaseModel):
    name: str
    description: str
    image_url: Optional[str] = Field(default=None, alias="imageUrl")
    product_count: int = Field(default=0, alias="productCount")

    class Config:
        populate_by_name = True

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str

    class Config:
        populate_by_name = True

# Cart Models
class CartItemBase(BaseModel):
    product_id: str = Field(alias="productId")
    quantity: int = 1

    class Config:
        populate_by_name = True

class CartItemCreate(CartItemBase):
    pass

class CartItemResponse(CartItemBase):
    id: str
    user_id: str = Field(alias="userId")
    product: Optional[ProductResponse] = None

    class Config:
        populate_by_name = True

# Order Models
class OrderBase(BaseModel):
    total_amount: int = Field(alias="totalAmount")
    status: str = "pending"
    items: Any
    shipping_address: str = Field(alias="shippingAddress")

    class Config:
        populate_by_name = True

class OrderCreate(BaseModel):
    shipping_address: str = Field(alias="shippingAddress")

    class Config:
        populate_by_name = True

class OrderResponse(OrderBase):
    id: str
    user_id: str = Field(alias="userId")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    class Config:
        populate_by_name = True

# Testimonial Models
class TestimonialBase(BaseModel):
    author: str
    role: str
    content: str
    image_url: Optional[str] = Field(default=None, alias="imageUrl")
    featured: bool = False

    class Config:
        populate_by_name = True

class TestimonialResponse(TestimonialBase):
    id: str

    class Config:
        populate_by_name = True

# Discount Code Models
class DiscountCodeBase(BaseModel):
    code: str
    description: str
    discount_type: str = Field(alias="discountType")
    discount_value: int = Field(alias="discountValue")
    is_active: bool = Field(default=True, alias="isActive")
    usage_limit: Optional[int] = Field(default=None, alias="usageLimit")
    used_count: int = Field(default=0, alias="usedCount")
    expires_at: Optional[datetime] = Field(default=None, alias="expiresAt")

    class Config:
        populate_by_name = True

class DiscountCodeCreate(BaseModel):
    code: str
    description: str
    discount_type: str = Field(alias="discountType")
    discount_value: int = Field(alias="discountValue")
    is_active: bool = Field(default=True, alias="isActive")
    usage_limit: Optional[int] = Field(default=None, alias="usageLimit")
    expires_at: Optional[datetime] = Field(default=None, alias="expiresAt")

    class Config:
        populate_by_name = True

class DiscountCodeResponse(DiscountCodeBase):
    id: str
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")

    class Config:
        populate_by_name = True

# Firebase Auth Model
class FirebaseAuth(BaseModel):
    id_token: str = Field(alias="idToken")
    email: EmailStr
    full_name: Optional[str] = Field(default=None, alias="fullName")
    profile_image: Optional[str] = Field(default=None, alias="profileImage")
    is_doctor: bool = Field(default=False, alias="isDoctor")
    doctor_title: Optional[str] = Field(default=None, alias="doctorTitle")
    doctor_specialty: Optional[str] = Field(default=None, alias="doctorSpecialty")
    doctor_bio: Optional[str] = Field(default=None, alias="doctorBio")

    class Config:
        populate_by_name = True

# Payment Models
class PaymentIntent(BaseModel):
    amount: int
    discount_code: Optional[str] = Field(default=None, alias="discountCode")

    class Config:
        populate_by_name = True

class ConfirmPayment(BaseModel):
    payment_intent_id: str = Field(alias="paymentIntentId")

    class Config:
        populate_by_name = True
