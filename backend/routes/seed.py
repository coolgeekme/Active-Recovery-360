from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from services.database import get_collection
from routes.auth import require_admin

router = APIRouter()

# Products data to seed
PRODUCTS_DATA = [
    # Hot/Cold Therapy - Requine Products
    {"name": "Hot/Cold Compression Sleeve - Size M", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 2900, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10, "visibility": "public"},
    {"name": "Hot/Cold Compression Sleeve - Size L", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 2900, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10, "visibility": "public"},
    {"name": "Hot/Cold Compression Sleeve - Size XL", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 2900, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10, "visibility": "public"},
    {"name": "Hot/Cold Compression Sleeve - Size XXL", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 2900, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10, "visibility": "public"},
    {"name": "Hot/Cold Therapy Flat Mat - 12\" x 18\"", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 3900, "description": "Treat multiple areas of the body and reduce core temperature without compression", "stockQuantity": 10, "visibility": "public"},
    
    # Topicals - Nano Extreme
    {"name": "NanoXtreme Topical Pain Relief Cream - 3.3oz Tube", "category": "Topicals", "brand": "Nano Extreme", "price": 4999, "description": "Topical Pain Relief Cream", "stockQuantity": 5, "visibility": "public"},
    {"name": "NanoXtreme Topical Pain Relief Cream - 3.3oz Pump", "category": "Topicals", "brand": "Nano Extreme", "price": 4999, "description": "Topical Pain Relief Cream with pump dispenser", "stockQuantity": 5, "visibility": "public"},
    {"name": "NanoXtreme Topical Pain Relief - 1oz Trial Size", "category": "Topicals", "brand": "Nano Extreme", "price": 1999, "description": "Topical Pain Relief Cream trial size", "stockQuantity": 5, "visibility": "public"},
    {"name": "NanoXtreme Topical Pain Relief - 32oz Bottle", "category": "Topicals", "brand": "Nano Extreme", "price": 39900, "description": "Topical Pain Relief Cream professional size", "stockQuantity": 5, "visibility": "public"},
    
    # Topicals - Tree Lotion
    {"name": "Recovery Extreme Heat Gel", "category": "Topicals", "brand": "Tree Lotion", "price": 3000, "description": "Recovery heat gel for muscle relief", "stockQuantity": 5, "visibility": "public"},
    {"name": "Recovery Extreme Cooling Gel", "category": "Topicals", "brand": "Tree Lotion", "price": 3000, "description": "Recovery cooling gel for muscle relief", "stockQuantity": 5, "visibility": "public"},
    {"name": "Recovery Extreme Sports Cream", "category": "Topicals", "brand": "Tree Lotion", "price": 3000, "description": "Recovery sports cream for athletes", "stockQuantity": 5, "visibility": "public"},
    {"name": "CBD Recovery Extreme Sports Cream 400mg", "category": "Topicals", "brand": "Tree Lotion", "price": 5000, "description": "CBD-infused recovery sports cream 400mg", "stockQuantity": 5, "visibility": "member"},
    {"name": "CBD Recovery Extreme Sports Cream 800mg", "category": "Topicals", "brand": "Tree Lotion", "price": 8000, "description": "CBD-infused recovery sports cream 800mg", "stockQuantity": 5, "visibility": "member"},
    
    # Topicals - Extract Labs
    {"name": "CBD Muscle & Recovery Lotion", "category": "Topicals", "brand": "Extract Labs", "price": 9095, "description": "CBD muscle and recovery lotion", "stockQuantity": 5, "visibility": "member"},
    {"name": "CBD Muscle & Recovery Roll On", "category": "Topicals", "brand": "Extract Labs", "price": 8995, "description": "CBD muscle and recovery roll on applicator", "stockQuantity": 5, "visibility": "member"},
    {"name": "CBD Muscle & Recovery Cream", "category": "Topicals", "brand": "Extract Labs", "price": 8995, "description": "CBD muscle and recovery cream", "stockQuantity": 5, "visibility": "member"},
    
    # Topicals - Fire & Ice
    {"name": "CBD Isolate Roll On 500mg", "category": "Topicals", "brand": "Fire & Ice", "price": 3995, "description": "CBD isolate roll on for pain relief", "stockQuantity": 5, "visibility": "member"},
    {"name": "CBD Isolate Relief Cream 250mg", "category": "Topicals", "brand": "Fire & Ice", "price": 3995, "description": "CBD isolate relief cream", "stockQuantity": 5, "visibility": "member"},
    
    # Recovery Garments - Incrediwear Knee
    {"name": "Incrediwear Knee Sleeve - Grey M", "category": "Recovery Garments", "brand": "Incrediwear", "price": 5499, "description": "Bioactive wearable IR sleeve for knee. Knee 12-14 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Knee Sleeve - Grey L", "category": "Recovery Garments", "brand": "Incrediwear", "price": 5499, "description": "Bioactive wearable IR sleeve for knee. Knee 14-16 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Knee Sleeve - Grey XL", "category": "Recovery Garments", "brand": "Incrediwear", "price": 5499, "description": "Bioactive wearable IR sleeve for knee. Knee 16-18 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Knee Sleeve - Black M", "category": "Recovery Garments", "brand": "Incrediwear", "price": 5499, "description": "Bioactive wearable IR sleeve in black. Knee 12-14 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Knee Sleeve - Black L", "category": "Recovery Garments", "brand": "Incrediwear", "price": 5499, "description": "Bioactive wearable IR sleeve in black. Knee 14-16 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Knee Sleeve - Black XL", "category": "Recovery Garments", "brand": "Incrediwear", "price": 5499, "description": "Bioactive wearable IR sleeve in black. Knee 16-18 inches.", "stockQuantity": 5, "visibility": "public"},
    
    # Recovery Garments - Incrediwear Ankle
    {"name": "Incrediwear Ankle Sleeve - Grey S/M", "category": "Recovery Garments", "brand": "Incrediwear", "price": 4499, "description": "Bioactive wearable IR ankle sleeve. M 4-8.5, W 5-9.5", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Ankle Sleeve - Grey L", "category": "Recovery Garments", "brand": "Incrediwear", "price": 4499, "description": "Bioactive wearable IR ankle sleeve. M 9-13, W 10+", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Ankle Sleeve - Black S/M", "category": "Recovery Garments", "brand": "Incrediwear", "price": 4499, "description": "Bioactive wearable IR ankle sleeve in black.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Ankle Sleeve - Black L", "category": "Recovery Garments", "brand": "Incrediwear", "price": 4499, "description": "Bioactive wearable IR ankle sleeve in black.", "stockQuantity": 5, "visibility": "public"},
    
    # Recovery Garments - Incrediwear Elbow
    {"name": "Incrediwear Elbow Sleeve - Grey S/M", "category": "Recovery Garments", "brand": "Incrediwear", "price": 4499, "description": "Bioactive wearable IR elbow sleeve. 9-14 inch bicep.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Elbow Sleeve - Grey L", "category": "Recovery Garments", "brand": "Incrediwear", "price": 4499, "description": "Bioactive wearable IR elbow sleeve. 14-20 inch bicep.", "stockQuantity": 5, "visibility": "public"},
    
    # Braces - Incrediwear Hip
    {"name": "Incrediwear Hip Brace - Right S", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR hip brace for right side. 17-19 inch thigh.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Hip Brace - Right M", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR hip brace for right side. 20-22 inch thigh.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Hip Brace - Right L", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR hip brace for right side. 23-25 inch thigh.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Hip Brace - Left S", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR hip brace for left side. 17-19 inch thigh.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Hip Brace - Left M", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR hip brace for left side. 20-22 inch thigh.", "stockQuantity": 5, "visibility": "public"},
    
    # Braces - Incrediwear Shoulder
    {"name": "Incrediwear Shoulder Brace - Grey S", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR shoulder brace. 9-11 inch bicep.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Shoulder Brace - Grey M", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR shoulder brace. 11-13 inch bicep.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Shoulder Brace - Grey L", "category": "Braces", "brand": "Incrediwear", "price": 8999, "description": "Bioactive wearable IR shoulder brace. 13-15 inch bicep.", "stockQuantity": 5, "visibility": "public"},
    
    # Braces - Incrediwear Back
    {"name": "Incrediwear Back Brace - S", "category": "Braces", "brand": "Incrediwear", "price": 9999, "description": "Bioactive wearable IR back brace. Waist 24-29 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Back Brace - M", "category": "Braces", "brand": "Incrediwear", "price": 9999, "description": "Bioactive wearable IR back brace. Waist 30-33 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Back Brace - L", "category": "Braces", "brand": "Incrediwear", "price": 9999, "description": "Bioactive wearable IR back brace. Waist 34-37 inches.", "stockQuantity": 5, "visibility": "public"},
    {"name": "Incrediwear Back Brace - XL", "category": "Braces", "brand": "Incrediwear", "price": 9999, "description": "Bioactive wearable IR back brace. Waist 38-44 inches.", "stockQuantity": 5, "visibility": "public"},
    
    # Electro Therapy - Marc Pro
    {"name": "Marc Pro Original", "category": "Electro Therapy", "brand": "MarcPro", "price": 69999, "description": "Professional electrotherapy device for muscle recovery", "stockQuantity": 5, "visibility": "doctor"},
    {"name": "Marc Pro Reusable Electrode - 4 Pack", "category": "Electro Therapy", "brand": "MarcPro", "price": 899, "description": "Reusable electrodes for Marc Pro device", "stockQuantity": 10, "visibility": "public"},
    {"name": "Marc Pro Reusable Electrode - 10 Pack", "category": "Electro Therapy", "brand": "MarcPro", "price": 7199, "description": "Reusable electrodes 10 pack for Marc Pro device", "stockQuantity": 10, "visibility": "public"},
    
    # Self-Care Tools - Tiger Tail
    {"name": "Tiger Tail Original 22\" Muscle Roller", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 4499, "description": "22 inch muscle roller stick for self-massage", "stockQuantity": 5, "visibility": "public"},
    {"name": "Tiger Tail Original 18\" Muscle Roller", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 3999, "description": "18 inch muscle roller stick for self-massage", "stockQuantity": 5, "visibility": "public"},
    {"name": "Tiger Tail Original 11\" Muscle Roller", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 3499, "description": "11 inch compact muscle roller stick", "stockQuantity": 5, "visibility": "public"},
    {"name": "Tiger Cane Acupressure Hook - Blue", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 2999, "description": "Acupressure massage hook for trigger point therapy", "stockQuantity": 5, "visibility": "public"},
    {"name": "Tiger Cane Acupressure Hook - Orange", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 2999, "description": "Acupressure massage hook for trigger point therapy", "stockQuantity": 5, "visibility": "public"},
    {"name": "Spiky Acupressure Roller", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 1999, "description": "Spiky roller for acupressure massage", "stockQuantity": 5, "visibility": "public"},
    
    # Self-Care Tools - Sidekick Scraper
    {"name": "Curve Muscle Scraper", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 6900, "description": "Muscle scraper tool for myofascial release", "stockQuantity": 5, "visibility": "public"},
    {"name": "Swerve Muscle Scraper", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 9500, "description": "Swerve muscle scraper for deep tissue work", "stockQuantity": 5, "visibility": "public"},
    {"name": "Echo Muscle Scraper Set", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 13500, "description": "Echo muscle scraper set for comprehensive treatment", "stockQuantity": 5, "visibility": "public"},
    {"name": "Eclipse Muscle Scraper", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 11900, "description": "Eclipse muscle scraper for professional use", "stockQuantity": 5, "visibility": "public"},
    {"name": "Bow Muscle Scraper", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 17000, "description": "Bow muscle scraper for targeted therapy", "stockQuantity": 5, "visibility": "doctor"},
    
    # Recovery Patches
    {"name": "Fire & Ice CBD Transdermal Patch", "category": "Recovery Patches", "brand": "Fire & Ice", "price": 1995, "description": "Transdermal CBD patch for pain relief", "stockQuantity": 5, "visibility": "member"},
    {"name": "CBD Lion Transdermal Patch 4-Pack - Black", "category": "Recovery Patches", "brand": "CBD Lion", "price": 2499, "description": "CBD transdermal patch 4-pack 40mg CBD", "stockQuantity": 5, "visibility": "member"},
    {"name": "CBD Lion Transdermal Patch 4-Pack - Tan", "category": "Recovery Patches", "brand": "CBD Lion", "price": 2499, "description": "CBD transdermal patch 4-pack 40mg CBD skin tone", "stockQuantity": 5, "visibility": "member"},
]

CATEGORIES_DATA = [
    {"name": "Hot/Cold Therapy", "description": "Hot and cold therapy products for recovery"},
    {"name": "Topicals", "description": "Topical recovery products and treatments"},
    {"name": "Electro Therapy", "description": "Electro therapy devices and equipment"},
    {"name": "Self-Care Tools", "description": "Self-care tools for recovery and wellness"},
    {"name": "Recovery Garments", "description": "Recovery garments and apparel"},
    {"name": "Compression Therapy", "description": "Compression therapy products for recovery"},
    {"name": "Recovery Patches", "description": "Recovery patches for targeted relief"},
    {"name": "Kinesiology Tape", "description": "Kinesiology tape for support and recovery"},
    {"name": "Braces", "description": "Braces and supports for injury recovery"},
]

@router.post("/seed-database")
async def seed_database(admin: dict = Depends(require_admin)):
    """Seed the database with categories and products. Admin only."""
    categories = get_collection("categories")
    products = get_collection("products")
    
    results = {"categories_added": 0, "products_added": 0, "skipped": 0}
    category_map = {}
    
    # First, ensure categories exist
    for cat_data in CATEGORIES_DATA:
        existing = await categories.find_one({"name": cat_data["name"]})
        if existing:
            category_map[cat_data["name"]] = str(existing["_id"])
        else:
            result = await categories.insert_one({
                "name": cat_data["name"],
                "description": cat_data["description"],
                "imageUrl": None,
                "productCount": 0
            })
            category_map[cat_data["name"]] = str(result.inserted_id)
            results["categories_added"] += 1
    
    # Add products
    for product in PRODUCTS_DATA:
        existing = await products.find_one({"name": product["name"]})
        if existing:
            results["skipped"] += 1
            continue
        
        category_id = category_map.get(product["category"])
        if not category_id:
            continue
        
        doc = {
            "name": product["name"],
            "description": product["description"],
            "price": product["price"],
            "imageUrl": product.get("imageUrl"),
            "visibility": product.get("visibility", "public"),
            "categoryId": category_id,
            "stockQuantity": product.get("stockQuantity", 5),
            "featured": False,
            "doctorIds": [],
            "createdAt": datetime.utcnow()
        }
        
        await products.insert_one(doc)
        
        # Update category product count
        await categories.update_one(
            {"_id": ObjectId(category_id)},
            {"$inc": {"productCount": 1}}
        )
        
        results["products_added"] += 1
    
    return {
        "message": "Database seeded successfully",
        "results": results
    }

@router.get("/seed-status")
async def check_seed_status():
    """Check current database status - no auth required."""
    categories = get_collection("categories")
    products = get_collection("products")
    
    cat_count = await categories.count_documents({})
    prod_count = await products.count_documents({})
    
    return {
        "categories": cat_count,
        "products": prod_count,
        "needs_seeding": prod_count < 50
    }

# Image mapping for products without images
PRODUCT_IMAGE_MAP = {
    # Hot/Cold Therapy
    "Hot/Cold Compression Sleeve": "https://images.unsplash.com/photo-1754941622138-b3c3671f2fa8?w=600&q=80",
    "Hot/Cold Therapy Flat Mat": "https://images.unsplash.com/photo-1609113160023-4e31f3765fd7?w=600&q=80",
    # Topicals
    "NanoXtreme": "https://images.unsplash.com/photo-1624459309337-c796a6834aad?w=600&q=80",
    "Recovery Extreme Heat Gel": "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600&q=80",
    "Recovery Extreme Cooling Gel": "https://images.unsplash.com/photo-1683586861092-596182a95463?w=600&q=80",
    "Recovery Extreme Sports Cream": "https://images.unsplash.com/photo-1518617840859-acd542e13a99?w=600&q=80",
    "CBD Recovery Extreme": "https://images.unsplash.com/photo-1712995519100-aa14da7414d3?w=600&q=80",
    "CBD Muscle & Recovery": "https://images.unsplash.com/photo-1679829201319-ddd8ebf6a32d?w=600&q=80",
    "CBD Isolate": "https://images.unsplash.com/photo-1711563658843-9dac90b206da?w=600&q=80",
    # Recovery Garments - Knee
    "Incrediwear Knee Sleeve": "https://images.unsplash.com/photo-1652354989460-ecccd5644412?w=600&q=80",
    # Recovery Garments - Ankle  
    "Incrediwear Ankle Sleeve": "https://images.unsplash.com/photo-1740512922093-9c2756ab5844?w=600&q=80",
    # Recovery Garments - Elbow
    "Incrediwear Elbow Sleeve": "https://images.unsplash.com/photo-1612888073644-c9d8fa45df5b?w=600&q=80",
    # Braces - Hip
    "Incrediwear Hip Brace": "https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=600&q=80",
    # Braces - Shoulder
    "Incrediwear Shoulder Brace": "https://images.unsplash.com/photo-1649751295468-953038600bef?w=600&q=80",
    # Braces - Back
    "Incrediwear Back Brace": "https://images.unsplash.com/photo-1640101942798-34d181efc234?w=600&q=80",
    # Electro Therapy
    "Marc Pro Original": "https://images.unsplash.com/photo-1609113160023-4e31f3765fd7?w=600&q=80",
    "Marc Pro Reusable Electrode": "https://images.unsplash.com/photo-1766325693728-348c38374d33?w=600&q=80",
    # Self-Care Tools
    "Tiger Tail": "https://images.unsplash.com/photo-1677252660464-cf6bed852c7c?w=600&q=80",
    "Tiger Cane": "https://images.unsplash.com/photo-1761284758997-1074f2a33114?w=600&q=80",
    "Spiky Acupressure": "https://images.unsplash.com/photo-1677252660464-cf6bed852c7c?w=600&q=80",
    "Muscle Scraper": "https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=600&q=80",
    "Curve Muscle Scraper": "https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=600&q=80",
    "Swerve Muscle Scraper": "https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=600&q=80",
    "Echo Muscle Scraper": "https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=600&q=80",
    "Eclipse Muscle Scraper": "https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=600&q=80",
    "Bow Muscle Scraper": "https://images.unsplash.com/photo-1649751361457-01d3a696c7e6?w=600&q=80",
    # Recovery Patches
    "CBD Transdermal Patch": "https://images.unsplash.com/photo-1624459309337-c796a6834aad?w=600&q=80",
    "CBD Lion Transdermal": "https://images.unsplash.com/photo-1624459309337-c796a6834aad?w=600&q=80",
}

@router.post("/add-images")
async def add_product_images(admin: dict = Depends(require_admin)):
    """Add images to products that are missing them. Admin only."""
    products = get_collection("products")
    
    # Find products without images
    products_without_images = await products.find(
        {"$or": [{"imageUrl": None}, {"imageUrl": ""}]}
    ).to_list(length=100)
    
    updated_count = 0
    skipped = []
    
    for product in products_without_images:
        product_name = product.get("name", "")
        image_url = None
        
        # Find matching image from map
        for pattern, url in PRODUCT_IMAGE_MAP.items():
            if pattern in product_name:
                image_url = url
                break
        
        if image_url:
            await products.update_one(
                {"_id": product["_id"]},
                {"$set": {"imageUrl": image_url}}
            )
            updated_count += 1
        else:
            skipped.append(product_name)
    
    return {
        "message": f"Updated {updated_count} products with images",
        "updated_count": updated_count,
        "skipped_products": skipped
    }

@router.post("/fix-broken-images")
async def fix_broken_images(admin: dict = Depends(require_admin)):
    """Replace external URLs with stock images. Admin only."""
    products = get_collection("products")
    
    # Find products with external (non-stock) URLs
    all_products = await products.find({}).to_list(length=200)
    
    updated_count = 0
    skipped = []
    
    for product in all_products:
        image_url = product.get("imageUrl", "")
        
        # Skip if already using stock images or no image
        if not image_url or "unsplash.com" in image_url or "pexels.com" in image_url:
            continue
        
        product_name = product.get("name", "")
        new_image_url = None
        
        # Find matching image from map
        for pattern, url in PRODUCT_IMAGE_MAP.items():
            if pattern in product_name:
                new_image_url = url
                break
        
        if new_image_url:
            await products.update_one(
                {"_id": product["_id"]},
                {"$set": {"imageUrl": new_image_url}}
            )
            updated_count += 1
        else:
            skipped.append(product_name)
    
    return {
        "message": f"Fixed {updated_count} products with broken images",
        "updated_count": updated_count,
        "skipped_products": skipped
    }
