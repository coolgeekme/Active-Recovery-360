from fastapi import APIRouter, HTTPException, Depends, status, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models.schemas import UserCreate, UserLogin, UserResponse, FirebaseAuth, PasswordResetRequest, PasswordReset
from services.database import get_collection
from services.auth import (
    hash_password, verify_password, create_access_token, decode_access_token, 
    verify_firebase_token, generate_reset_token, create_reset_token_expiry, is_reset_token_valid
)
from services.email import send_password_reset_email, send_hcp_approval_email

router = APIRouter()
security = HTTPBearer(auto_error=False)

def transform_user(user_doc: dict) -> dict:
    """Transform MongoDB document to API response format"""
    if not user_doc:
        return None
    return {
        "id": str(user_doc["_id"]),
        "username": user_doc.get("username", ""),
        "email": user_doc.get("email", ""),
        "fullName": user_doc.get("fullName", user_doc.get("full_name", "")),
        "isMember": user_doc.get("isMember", user_doc.get("is_member", False)),
        "isAdmin": user_doc.get("isAdmin", user_doc.get("is_admin", False)),
        "isDoctor": user_doc.get("isDoctor", user_doc.get("is_doctor", False)),
        "doctorTitle": user_doc.get("doctorTitle", user_doc.get("doctor_title")),
        "doctorSpecialty": user_doc.get("doctorSpecialty", user_doc.get("doctor_specialty")),
        "doctorBio": user_doc.get("doctorBio", user_doc.get("doctor_bio")),
        "profileImage": user_doc.get("profileImage", user_doc.get("profile_image")),
        "createdAt": user_doc.get("createdAt", user_doc.get("created_at")),
        # HCP fields
        "licenseNumber": user_doc.get("licenseNumber"),
        "hcpStatus": user_doc.get("hcpStatus"),  # pending, approved, rejected, null
        "specialty": user_doc.get("specialty")
    }

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(user_id)})
    return transform_user(user) if user else None

async def require_auth(user: Optional[dict] = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(user: dict = Depends(require_auth)) -> dict:
    if not user.get("isAdmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_member(user: dict = Depends(require_auth)) -> dict:
    if not user.get("isMember"):
        raise HTTPException(status_code=403, detail="Membership required")
    return user

@router.post("/register")
async def register(user_data: UserCreate):
    users = get_collection("users")
    
    # Check if username exists
    existing = await users.find_one({"username": {"$regex": f"^{user_data.username}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists
    existing = await users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    new_user = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "fullName": user_data.full_name,
        "isMember": False,
        "isAdmin": False,
        "isDoctor": False,
        "createdAt": datetime.utcnow()
    }
    
    # Handle HCP application
    if user_data.is_hcp_application:
        if not user_data.license_number:
            raise HTTPException(status_code=400, detail="License number is required for HCP registration")
        new_user["licenseNumber"] = user_data.license_number
        new_user["specialty"] = user_data.specialty
        new_user["hcpStatus"] = "pending"  # pending, approved, rejected
        new_user["hcpAppliedAt"] = datetime.utcnow()
    
    result = await users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    
    # Create token
    token = create_access_token({"sub": str(result.inserted_id)})
    
    user_response = transform_user(new_user)
    return {"user": user_response, "token": token}

@router.post("/login")
async def login(credentials: UserLogin):
    users = get_collection("users")
    
    # Try to find by username first, then by email
    user = await users.find_one({"username": {"$regex": f"^{credentials.username}$", "$options": "i"}})
    if not user:
        # Try by email
        user = await users.find_one({"email": {"$regex": f"^{credentials.username}$", "$options": "i"}})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_access_token({"sub": str(user["_id"])})
    
    user_response = transform_user(user)
    return {"user": user_response, "token": token}

@router.post("/auth/firebase")
async def firebase_auth(auth_data: FirebaseAuth):
    # Verify Firebase token
    firebase_user = await verify_firebase_token(auth_data.id_token)
    if not firebase_user:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    
    users = get_collection("users")
    
    # Check if user exists
    user = await users.find_one({"email": auth_data.email})
    
    if user:
        # Update profile image if changed
        if auth_data.profile_image and auth_data.profile_image != user.get("profileImage"):
            await users.update_one(
                {"_id": user["_id"]},
                {"$set": {"profileImage": auth_data.profile_image}}
            )
            user["profileImage"] = auth_data.profile_image
    else:
        # Create new user
        username = auth_data.email.split("@")[0]
        
        # Ensure unique username
        counter = 1
        base_username = username
        while await users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}):
            username = f"{base_username}_{counter}"
            counter += 1
        
        new_user = {
            "username": username,
            "email": auth_data.email,
            "password": "",
            "fullName": auth_data.full_name or "User",
            "isMember": False,
            "isAdmin": False,
            "isDoctor": auth_data.is_doctor,
            "doctorTitle": auth_data.doctor_title,
            "doctorSpecialty": auth_data.doctor_specialty,
            "doctorBio": auth_data.doctor_bio,
            "profileImage": auth_data.profile_image,
            "createdAt": datetime.utcnow()
        }
        
        result = await users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user = new_user
    
    # Create token
    token = create_access_token({"sub": str(user["_id"])})
    
    user_response = transform_user(user)
    return {"user": user_response, "token": token}

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}

@router.get("/user")
async def get_user(user: dict = Depends(require_auth)):
    return user

@router.post("/membership/purchase")
async def purchase_membership(user: dict = Depends(require_auth)):
    if user.get("isMember"):
        raise HTTPException(status_code=400, detail="Already a member")
    
    users = get_collection("users")
    await users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"isMember": True}}
    )
    
    user["isMember"] = True
    return user

@router.patch("/user/profile")
async def update_profile(updates: dict, user: dict = Depends(require_auth)):
    allowed_fields = ["username", "email", "fullName"]
    valid_updates = {k: v for k, v in updates.items() if k in allowed_fields and v}
    
    if not valid_updates:
        raise HTTPException(status_code=400, detail="No valid updates provided")
    
    users = get_collection("users")
    
    # Check username uniqueness
    if "username" in valid_updates:
        existing = await users.find_one({
            "username": {"$regex": f"^{valid_updates['username']}$", "$options": "i"},
            "_id": {"$ne": ObjectId(user["id"])}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Check email uniqueness
    if "email" in valid_updates:
        existing = await users.find_one({
            "email": valid_updates["email"],
            "_id": {"$ne": ObjectId(user["id"])}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
    
    await users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": valid_updates}
    )
    
    updated_user = await users.find_one({"_id": ObjectId(user["id"])})
    return transform_user(updated_user)


# Password Reset Endpoints
@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request a password reset email"""
    users = get_collection("users")
    
    user = await users.find_one({"email": request.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with this email exists, a password reset link has been sent."}
    
    # Don't allow reset for Firebase-only users (no password set)
    if not user.get("password"):
        return {"message": "This account uses Google Sign-In. Please use Google to log in."}
    
    # Generate reset token
    reset_token = generate_reset_token()
    reset_expiry = create_reset_token_expiry()
    
    # Store token in database
    await users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "resetToken": reset_token,
            "resetTokenExpiry": reset_expiry
        }}
    )
    
    # Send reset email
    await send_password_reset_email(
        to_email=user["email"],
        reset_token=reset_token,
        user_name=user.get("fullName", "User")
    )
    
    return {"message": "If an account with this email exists, a password reset link has been sent."}

@router.post("/reset-password")
async def reset_password(request: PasswordReset):
    """Reset password using token"""
    users = get_collection("users")
    
    # Find user with valid token
    user = await users.find_one({"resetToken": request.token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check token expiry
    if not user.get("resetTokenExpiry") or not is_reset_token_valid(user["resetTokenExpiry"]):
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")
    
    # Update password and clear token
    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password": hash_password(request.new_password)},
            "$unset": {"resetToken": "", "resetTokenExpiry": ""}
        }
    )
    
    return {"message": "Password has been reset successfully. You can now log in with your new password."}

# HCP Reapply Endpoint
@router.post("/hcp/reapply")
async def hcp_reapply(license_data: dict, user: dict = Depends(require_auth)):
    """Allow rejected HCPs to reapply"""
    users = get_collection("users")
    
    # Check if user was previously rejected
    current_user = await users.find_one({"_id": ObjectId(user["id"])})
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user.get("hcpStatus") == "approved":
        raise HTTPException(status_code=400, detail="You are already an approved Healthcare Professional")
    
    if current_user.get("hcpStatus") == "pending":
        raise HTTPException(status_code=400, detail="Your application is already pending review")
    
    license_number = license_data.get("licenseNumber")
    specialty = license_data.get("specialty")
    
    if not license_number:
        raise HTTPException(status_code=400, detail="License number is required")
    
    # Update user with new application
    await users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {
            "licenseNumber": license_number,
            "specialty": specialty,
            "hcpStatus": "pending",
            "hcpAppliedAt": datetime.utcnow()
        }}
    )
    
    updated_user = await users.find_one({"_id": ObjectId(user["id"])})
    return transform_user(updated_user)
