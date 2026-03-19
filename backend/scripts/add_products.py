import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Products from Google Sheet
products_data = [
    # Hot/Cold Therapy - Requine Products
    {"name": "Hot/Cold Compression Sleeve - Size M", "sku": "CS-01", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 29.00, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10},
    {"name": "Hot/Cold Compression Sleeve - Size L", "sku": "CS-02", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 29.00, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10},
    {"name": "Hot/Cold Compression Sleeve - Size XL", "sku": "CS-03", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 29.00, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10},
    {"name": "Hot/Cold Compression Sleeve - Size XXL", "sku": "CS-04", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 29.00, "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression", "stockQuantity": 10},
    {"name": "Hot/Cold Therapy Flat Mat - 12\" x 18\"", "sku": "CFM-01", "category": "Hot/Cold Therapy", "brand": "Requine Products", "price": 39.00, "description": "Treat multiple areas of the body and reduce core temperature without compression", "stockQuantity": 10},
    
    # Topicals - Nano Extreme (Non-CBD)
    {"name": "NanoXtreme Topical Pain Relief Cream - 3.3oz Tube", "sku": "NE-3.3T", "category": "Topicals", "brand": "Nano Extreme", "price": 49.99, "description": "Topical Pain Relief Cream", "stockQuantity": 5, "imageUrl": "https://www.nanoxtreme.com/products/nanoxtreme-tube"},
    {"name": "NanoXtreme Topical Pain Relief Cream - 3.3oz Pump", "sku": "NE-3.3A", "category": "Topicals", "brand": "Nano Extreme", "price": 49.99, "description": "Topical Pain Relief Cream with pump dispenser", "stockQuantity": 5, "imageUrl": "https://www.nanoxtreme.com/products/nanox-pump-bottle"},
    {"name": "NanoXtreme Topical Pain Relief - 1oz Trial Size", "sku": "NE-01", "category": "Topicals", "brand": "Nano Extreme", "price": 19.99, "description": "Topical Pain Relief Cream trial size", "stockQuantity": 5, "imageUrl": "https://www.nanoxtreme.com/products/nanox-1oz-trail-size"},
    {"name": "NanoXtreme Topical Pain Relief - 32oz Bottle", "sku": "NE-32", "category": "Topicals", "brand": "Nano Extreme", "price": 399.00, "description": "Topical Pain Relief Cream professional size", "stockQuantity": 5, "imageUrl": "https://www.nanoxtreme.com/products/nanoxtreme-32oz-bottle"},
    
    # Topicals - Tree Lotion (Non-CBD)
    {"name": "Recovery Extreme Heat Gel", "sku": "TL-REHG-01", "category": "Topicals", "brand": "Tree Lotion", "price": 30.00, "description": "Recovery heat gel for muscle relief", "stockQuantity": 5},
    {"name": "Recovery Extreme Cooling Gel", "sku": "TL-RECG-01", "category": "Topicals", "brand": "Tree Lotion", "price": 30.00, "description": "Recovery cooling gel for muscle relief", "stockQuantity": 5},
    {"name": "Recovery Extreme Sports Cream", "sku": "TL-ESC-01", "category": "Topicals", "brand": "Tree Lotion", "price": 30.00, "description": "Recovery sports cream for athletes", "stockQuantity": 5},
    
    # Topicals - Tree Lotion (CBD)
    {"name": "CBD Recovery Extreme Sports Cream 400mg", "sku": "TL-RESC-4", "category": "Topicals", "brand": "Tree Lotion", "price": 50.00, "description": "CBD-infused recovery sports cream 400mg", "stockQuantity": 5, "visibility": "member"},
    {"name": "CBD Recovery Extreme Sports Cream 800mg", "sku": "TL-RESC-8", "category": "Topicals", "brand": "Tree Lotion", "price": 80.00, "description": "CBD-infused recovery sports cream 800mg", "stockQuantity": 5, "visibility": "member"},
    
    # Topicals - Extract Labs (CBD)
    {"name": "CBD Muscle & Recovery Lotion", "sku": "EL-MRL-01", "category": "Topicals", "brand": "Extract Labs", "price": 90.95, "description": "CBD muscle and recovery lotion", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://www.extractlabs.com/product/cbd-lotion-for-relief/"},
    {"name": "CBD Muscle & Recovery Roll On", "sku": "EL-MRR-01", "category": "Topicals", "brand": "Extract Labs", "price": 89.95, "description": "CBD muscle and recovery roll on applicator", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://www.extractlabs.com/product/muscle-recovery-roll-on/"},
    {"name": "CBD Muscle & Recovery Cream", "sku": "EL-MRC-01", "category": "Topicals", "brand": "Extract Labs", "price": 89.95, "description": "CBD muscle and recovery cream", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://www.extractlabs.com/product/cbd-muscle-cream/"},
    
    # Topicals - Fire & Ice (CBD)
    {"name": "CBD Isolate Roll On 500mg", "sku": "FI-Roll-01", "category": "Topicals", "brand": "Fire & Ice", "price": 39.95, "description": "CBD isolate roll on for pain relief", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://fireandiceathletics.com/product/500mg-cbd-isolate-roll-on/"},
    {"name": "CBD Isolate Relief Cream 250mg", "sku": "FI-PRC-01", "category": "Topicals", "brand": "Fire & Ice", "price": 39.95, "description": "CBD isolate relief cream", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://fireandiceathletics.com/product/250mg-cbd-isolate-relief-cream/"},
    
    # Recovery Garments - Incrediwear Knee Sleeves
    {"name": "Incrediwear Knee Sleeve - Grey M", "sku": "G702", "category": "Recovery Garments", "brand": "Incrediwear", "price": 54.99, "description": "Bioactive wearable IR sleeve for knee. Semiconductor embedded products help provide greater relief than traditional compression. Knee 12-14 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Knee Sleeve - Grey L", "sku": "G703", "category": "Recovery Garments", "brand": "Incrediwear", "price": 54.99, "description": "Bioactive wearable IR sleeve for knee. Semiconductor embedded products help provide greater relief than traditional compression. Knee 14-16 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Knee Sleeve - Grey XL", "sku": "G704", "category": "Recovery Garments", "brand": "Incrediwear", "price": 54.99, "description": "Bioactive wearable IR sleeve for knee. Semiconductor embedded products help provide greater relief than traditional compression. Knee 16-18 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Knee Sleeve - Black M", "sku": "GB702", "category": "Recovery Garments", "brand": "Incrediwear", "price": 54.99, "description": "Bioactive wearable IR sleeve for knee in black. Knee 12-14 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Knee Sleeve - Black L", "sku": "GB703", "category": "Recovery Garments", "brand": "Incrediwear", "price": 54.99, "description": "Bioactive wearable IR sleeve for knee in black. Knee 14-16 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Knee Sleeve - Black XL", "sku": "GB704", "category": "Recovery Garments", "brand": "Incrediwear", "price": 54.99, "description": "Bioactive wearable IR sleeve for knee in black. Knee 16-18 inches.", "stockQuantity": 5},
    
    # Recovery Garments - Incrediwear Ankle Sleeves
    {"name": "Incrediwear Ankle Sleeve - Grey S/M", "sku": "G706", "category": "Recovery Garments", "brand": "Incrediwear", "price": 44.99, "description": "Bioactive wearable IR ankle sleeve. For those looking to reduce swelling, relieve pain, and restore mobility. M 4-8.5, W 5-9.5", "stockQuantity": 5, "imageUrl": "https://incrediwear.com/cdn/shop/files/incrediwearstudioshoot-61copy.jpg?v=1759567318&width=1000"},
    {"name": "Incrediwear Ankle Sleeve - Grey L", "sku": "G707", "category": "Recovery Garments", "brand": "Incrediwear", "price": 44.99, "description": "Bioactive wearable IR ankle sleeve. M 9-13, W 10+", "stockQuantity": 5, "imageUrl": "https://incrediwear.com/cdn/shop/files/incrediwearstudioshoot-61copy.jpg?v=1759567318&width=1000"},
    {"name": "Incrediwear Ankle Sleeve - Black S/M", "sku": "GB706", "category": "Recovery Garments", "brand": "Incrediwear", "price": 44.99, "description": "Bioactive wearable IR ankle sleeve in black. M 4-8.5, W 5-9.5", "stockQuantity": 5, "imageUrl": "https://incrediwear.com/cdn/shop/files/incrediwearproductshoot-1.jpg?v=1761793189&width=1000"},
    {"name": "Incrediwear Ankle Sleeve - Black L", "sku": "GB707", "category": "Recovery Garments", "brand": "Incrediwear", "price": 44.99, "description": "Bioactive wearable IR ankle sleeve in black. M 9-13, W 10+", "stockQuantity": 5, "imageUrl": "https://incrediwear.com/cdn/shop/files/incrediwearproductshoot-1.jpg?v=1761793189&width=1000"},
    
    # Recovery Garments - Incrediwear Elbow Sleeves
    {"name": "Incrediwear Elbow Sleeve - Grey S/M", "sku": "G701", "category": "Recovery Garments", "brand": "Incrediwear", "price": 44.99, "description": "Bioactive wearable IR elbow sleeve. 9-14 inch bicep.", "stockQuantity": 5},
    {"name": "Incrediwear Elbow Sleeve - Grey L", "sku": "G701b", "category": "Recovery Garments", "brand": "Incrediwear", "price": 44.99, "description": "Bioactive wearable IR elbow sleeve. 14-20 inch bicep.", "stockQuantity": 5},
    
    # Braces - Incrediwear Hip Brace
    {"name": "Incrediwear Hip Brace - Right S", "sku": "HIP101R", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR hip brace for right side. 17-19 inch thigh.", "stockQuantity": 5},
    {"name": "Incrediwear Hip Brace - Right M", "sku": "HIP102R", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR hip brace for right side. 20-22 inch thigh.", "stockQuantity": 5},
    {"name": "Incrediwear Hip Brace - Right L", "sku": "HIP103R", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR hip brace for right side. 23-25 inch thigh.", "stockQuantity": 5},
    {"name": "Incrediwear Hip Brace - Left S", "sku": "HIP201L", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR hip brace for left side. 17-19 inch thigh.", "stockQuantity": 5},
    {"name": "Incrediwear Hip Brace - Left M", "sku": "HIP202L", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR hip brace for left side. 20-22 inch thigh.", "stockQuantity": 5},
    
    # Braces - Incrediwear Shoulder Brace
    {"name": "Incrediwear Shoulder Brace - Grey S", "sku": "GR801", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR shoulder brace. 9-11 inch bicep.", "stockQuantity": 5},
    {"name": "Incrediwear Shoulder Brace - Grey M", "sku": "GR802", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR shoulder brace. 11-13 inch bicep.", "stockQuantity": 5},
    {"name": "Incrediwear Shoulder Brace - Grey L", "sku": "GR803", "category": "Braces", "brand": "Incrediwear", "price": 89.99, "description": "Bioactive wearable IR shoulder brace. 13-15 inch bicep.", "stockQuantity": 5},
    
    # Braces - Incrediwear Back Brace
    {"name": "Incrediwear Back Brace - S", "sku": "GR708", "category": "Braces", "brand": "Incrediwear", "price": 99.99, "description": "Bioactive wearable IR back brace. Waist 24-29 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Back Brace - M", "sku": "GR709", "category": "Braces", "brand": "Incrediwear", "price": 99.99, "description": "Bioactive wearable IR back brace. Waist 30-33 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Back Brace - L", "sku": "GR710", "category": "Braces", "brand": "Incrediwear", "price": 99.99, "description": "Bioactive wearable IR back brace. Waist 34-37 inches.", "stockQuantity": 5},
    {"name": "Incrediwear Back Brace - XL", "sku": "GR713", "category": "Braces", "brand": "Incrediwear", "price": 99.99, "description": "Bioactive wearable IR back brace. Waist 38-44 inches.", "stockQuantity": 5},
    
    # Electro Therapy - Marc Pro
    {"name": "Marc Pro Original", "sku": "MPRO-01", "category": "Electro Therapy", "brand": "MarcPro", "price": 699.99, "description": "Professional electrotherapy device for muscle recovery", "stockQuantity": 5, "imageUrl": "https://marcpro.com/wp-content/uploads/2015/09/StorePage1NEW-1.jpg", "visibility": "doctor"},
    {"name": "Marc Pro Reusable Electrode - 4 Pack", "sku": "MPRE-04", "category": "Electro Therapy", "brand": "MarcPro", "price": 8.99, "description": "Reusable electrodes for Marc Pro device", "stockQuantity": 10, "imageUrl": "https://marcpro.com/wp-content/uploads/2015/10/NewElectrodes.jpg"},
    {"name": "Marc Pro Reusable Electrode - 10 Pack", "sku": "MPRE-10", "category": "Electro Therapy", "brand": "MarcPro", "price": 71.99, "description": "Reusable electrodes 10 pack for Marc Pro device", "stockQuantity": 10, "imageUrl": "https://marcpro.com/wp-content/uploads/2015/10/ElectrodesNew10Pack.jpg"},
    
    # Self-Care Tools - Tiger Tail
    {"name": "Tiger Tail Original 22\" Muscle Roller", "sku": "22TTRC", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 44.99, "description": "22 inch muscle roller stick for self-massage", "stockQuantity": 5, "imageUrl": "https://tigertailusa.com/product/the-long-one/"},
    {"name": "Tiger Tail Original 18\" Muscle Roller", "sku": "18TTRC", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 39.99, "description": "18 inch muscle roller stick for self-massage", "stockQuantity": 5, "imageUrl": "https://tigertailusa.com/product/the-best-foam-roller-massage-tool/"},
    {"name": "Tiger Tail Original 11\" Muscle Roller", "sku": "11TTRC", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 34.99, "description": "11 inch compact muscle roller stick", "stockQuantity": 5, "imageUrl": "https://tigertailusa.com/product/the-roadster/"},
    {"name": "Tiger Cane Acupressure Hook - Blue", "sku": "TCBLU", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 29.99, "description": "Acupressure massage hook for trigger point therapy", "stockQuantity": 5, "imageUrl": "https://tigertailusa.com/product/tiger-cane-acupressure-massage-hook/"},
    {"name": "Tiger Cane Acupressure Hook - Orange", "sku": "TCORG", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 29.99, "description": "Acupressure massage hook for trigger point therapy", "stockQuantity": 5, "imageUrl": "https://tigertailusa.com/product/tiger-cane-acupressure-massage-hook/"},
    {"name": "Spiky Acupressure Roller", "sku": "ACUROL", "category": "Self-Care Tools", "brand": "Tiger Tail", "price": 19.99, "description": "Spiky roller for acupressure massage", "stockQuantity": 5},
    
    # Self-Care Tools - Sidekick Scraper
    {"name": "Curve Muscle Scraper", "sku": "SKC-01", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 69.00, "description": "Muscle scraper tool for myofascial release", "stockQuantity": 5, "imageUrl": "https://sidekicktool.com/cdn/shop/files/PDP-1_Curve-Gel-Towel-Case_2000x1600_64adf0df-1590-497e-8a7c-3a4965e18e2a_1000x.jpg"},
    {"name": "Swerve Muscle Scraper", "sku": "SKS-01", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 95.00, "description": "Swerve muscle scraper for deep tissue work", "stockQuantity": 5},
    {"name": "Echo Muscle Scraper Set", "sku": "SKE-01", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 135.00, "description": "Echo muscle scraper set for comprehensive treatment", "stockQuantity": 5, "imageUrl": "https://sidekicktool.com/cdn/shop/files/PDP1_Echo-set_2000x1600_cb-3_1000x.jpg"},
    {"name": "Eclipse Muscle Scraper", "sku": "SKEC-01", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 119.00, "description": "Eclipse muscle scraper for professional use", "stockQuantity": 5},
    {"name": "Bow Muscle Scraper", "sku": "SKB-01", "category": "Self-Care Tools", "brand": "Sidekick Scraper", "price": 170.00, "description": "Bow muscle scraper for targeted therapy", "stockQuantity": 5, "visibility": "doctor"},
    
    # Recovery Patches - Fire & Ice CBD Patch
    {"name": "Fire & Ice CBD Transdermal Patch", "sku": "FI-TP-01", "category": "Recovery Patches", "brand": "Fire & Ice", "price": 19.95, "description": "Transdermal CBD patch for pain relief", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://fireandiceathletics.com/product/cbd-isolate-pain-relief-patch/"},
    
    # Recovery Patches - CBD Lion
    {"name": "CBD Lion Transdermal Patch 4-Pack - Black", "sku": "CBDL-01B", "category": "Recovery Patches", "brand": "CBD Lion", "price": 24.99, "description": "CBD transdermal patch 4-pack 40mg CBD", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://cbdlion.com/cbd-patch-4-pack-40mg-cbd/"},
    {"name": "CBD Lion Transdermal Patch 4-Pack - Tan", "sku": "CBDL-01T", "category": "Recovery Patches", "brand": "CBD Lion", "price": 24.99, "description": "CBD transdermal patch 4-pack 40mg CBD skin tone", "stockQuantity": 5, "visibility": "member", "imageUrl": "https://cbdlion.com/cbd-patch-4-pack-40mg-cbd/"},
]

# Category mapping
category_map = {
    "Hot/Cold Therapy": "69a74a0ce5b1b6ab1265061d",
    "Topicals": "69a74a0ce5b1b6ab1265061f",
    "Electro Therapy": "69a74a0ce5b1b6ab12650621",
    "Self-Care Tools": "69a74a0ce5b1b6ab12650623",
    "Recovery Garments": "69a74a0ce5b1b6ab12650625",
    "Compression Therapy": "69a74a0ce5b1b6ab12650627",
    "Recovery Patches": "69a74a0ce5b1b6ab12650629",
    "Kinesiology Tape": "69a74a0ce5b1b6ab1265062b",
    "Braces": "69a74a0ce5b1b6ab1265062d",
}

async def add_products():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["ar360"]
    products_collection = db["products"]
    
    added = 0
    skipped = 0
    
    for product in products_data:
        # Check if product already exists by SKU
        existing = await products_collection.find_one({"name": product["name"]})
        if existing:
            print(f"Skipped (exists): {product['name']}")
            skipped += 1
            continue
        
        # Map category name to ID
        category_id = category_map.get(product["category"])
        if not category_id:
            print(f"Warning: Unknown category {product['category']} for {product['name']}")
            continue
        
        # Create product document
        doc = {
            "name": product["name"],
            "description": product.get("description", ""),
            "price": int(product["price"] * 100),  # Convert to cents
            "imageUrl": product.get("imageUrl"),
            "visibility": product.get("visibility", "public"),
            "categoryId": category_id,
            "stockQuantity": product.get("stockQuantity", 5),
            "featured": product.get("featured", False),
            "doctorIds": [],
            "createdAt": datetime.utcnow()
        }
        
        result = await products_collection.insert_one(doc)
        print(f"Added: {product['name']} (ID: {result.inserted_id})")
        added += 1
    
    print(f"\nTotal: {added} added, {skipped} skipped")
    client.close()

if __name__ == "__main__":
    asyncio.run(add_products())
