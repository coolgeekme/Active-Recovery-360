from fastapi import APIRouter, Query
from typing import Optional

from services.database import get_collection

router = APIRouter()

def transform_testimonial(doc: dict) -> dict:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "author": doc.get("author", ""),
        "role": doc.get("role", ""),
        "content": doc.get("content", ""),
        "imageUrl": doc.get("imageUrl"),
        "featured": doc.get("featured", False)
    }

@router.get("/testimonials")
async def get_testimonials(featured: Optional[bool] = None):
    testimonials = get_collection("testimonials")
    
    query = {}
    if featured is not None:
        query["featured"] = featured
    
    cursor = testimonials.find(query)
    docs = await cursor.to_list(length=50)
    
    return [transform_testimonial(doc) for doc in docs]
