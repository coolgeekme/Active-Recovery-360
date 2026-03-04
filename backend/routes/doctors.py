from fastapi import APIRouter, HTTPException
from bson import ObjectId

from services.database import get_collection

router = APIRouter()

def transform_doctor(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "username": doc.get("username", ""),
        "email": doc.get("email", ""),
        "fullName": doc.get("fullName", ""),
        "doctorTitle": doc.get("doctorTitle"),
        "doctorSpecialty": doc.get("doctorSpecialty"),
        "doctorBio": doc.get("doctorBio"),
        "profileImage": doc.get("profileImage")
    }

@router.get("/doctors")
async def get_doctors():
    users = get_collection("users")
    
    cursor = users.find({"isDoctor": True})
    docs = await cursor.to_list(length=100)
    
    return [transform_doctor(doc) for doc in docs]

@router.get("/doctors/{doctor_id}")
async def get_doctor(doctor_id: str):
    users = get_collection("users")
    
    try:
        doc = await users.find_one({"_id": ObjectId(doctor_id), "isDoctor": True})
    except:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    return transform_doctor(doc)
