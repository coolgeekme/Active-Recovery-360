"""
One-shot import script: load AR360 product catalog from official Google Sheet,
upload available product images from Google Drive folder to Object Storage,
and replace existing seeded products in MongoDB with the consolidated catalog.

Usage:
    cd /app/backend && python3 scripts/import_products.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Make backend modules importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
from services.storage import init_storage, put_object

DRIVE_DIR = Path("/tmp/drive_images/Shared Folder Active Recovery 360")
KINESIO_DIR = DRIVE_DIR / "kinesiology tape images"

MIME = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}

# Mapping of Drive filenames to logical product image keys
LOCAL_IMAGE_MAP = {
    "compression_sleeve": DRIVE_DIR / "Active Recovery 360 Sleeve Mockup.png",
    "flat_mat": DRIVE_DIR / "Active Recovery Flat Mat Mockup.png",
    "tree_lotion_cooling": DRIVE_DIR / "Fire & Ice extreme cooling gel.jpg",
    "tree_lotion_heating": DRIVE_DIR / "Fire & Ice extreme heating gel.jpg",
    "tree_lotion_cbd_cream": DRIVE_DIR / "Extreme Sports CBD Recovery cream.JPG",
    "fire_ice_relief_cream": DRIVE_DIR / "Relief Cream and Box.png",
    "fire_ice_roll_on": DRIVE_DIR / "Roll On and Box 1500px no pain.png",
    "kt_2pack_black": KINESIO_DIR / "Kinesiology tape 2 pack Black.jpg",
    "kt_2pack_white": KINESIO_DIR / "Kinesiooogy Tape 2 pack white.jpg",
    "kt_2pack_blue": KINESIO_DIR / "Kinesiology Tape 2 pack Blue.jpg",
    "kt_2pack_green": KINESIO_DIR / "Kinesiology Tape 2 pack Green.jpg",
    "kt_2pack_orange": KINESIO_DIR / "Kinesiology Tape 2 pack Orange.jpg",
    "kt_2pack_pink": KINESIO_DIR / "Kinesiology Tape 2 pack Pink.jpg",
    "kt_2pack_purple": KINESIO_DIR / "Kinesiology Tape 2 pack Purple.jpg",
    "kt_2pack_red": KINESIO_DIR / "Kinesiology Tape 2 pack Red.jpg",
    "kt_2pack_yellow": KINESIO_DIR / "Kinesiology Tape 2 pack Yellow.jpg",
    "kt_2pack_tan": KINESIO_DIR / "Kinesiology tape 2 pack Tan.jpg",
    "kt_roll_black": KINESIO_DIR / "Kinesiology Tape Clinic Roll Black.jpg",
    "kt_roll_white": KINESIO_DIR / "Kinesiology Tape Clinic Roll White.jpg",
    "kt_roll_blue": KINESIO_DIR / "Kinesiology Tape Clinic Rol Blue.jpg",
    "kt_roll_green": KINESIO_DIR / "Kinesiology Tape Clinic Roll Green.jpg",
    "kt_roll_orange": KINESIO_DIR / "Kinesiology Tape Clinic Roll Orange.jpg",
    "kt_roll_pink": KINESIO_DIR / "Kinesiology Tape Clinic Roll Pink.jpg",
    "kt_roll_purple": KINESIO_DIR / "Kinesiology Tape Clinic Roll Purple.jpg",
    "kt_roll_red": KINESIO_DIR / "Kinesiology Tape Clinic Roll Red.jpg",
    "kt_roll_yellow": KINESIO_DIR / "Kinesiology Tape Clinic Roll Yellow.jpg",
    "kt_roll_tan": KINESIO_DIR / "Kinesiology Tape Clinic Roll Tan.jpg",
}

# Stock fallback images for products lacking official imagery
STOCK_FALLBACK = {
    "Topicals":           "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80",
    "Hot/Cold Therapy":   "https://images.unsplash.com/photo-1609113160023-4e31f3765fd7?w=800&q=80",
    "Recovery Garments":  "https://images.unsplash.com/photo-1652354989460-ecccd5644412?w=800&q=80",
    "Braces":             "https://images.unsplash.com/photo-1640101942798-34d181efc234?w=800&q=80",
    "Electro Therapy":    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    "Self-Care Tools":    "https://images.unsplash.com/photo-1677252660464-cf6bed852c7c?w=800&q=80",
    "Cold Compression":   "https://images.unsplash.com/photo-1640101942798-34d181efc234?w=800&q=80",
    "Recovery Patches":   "https://images.unsplash.com/photo-1624459309337-c796a6834aad?w=800&q=80",
    "Exercise Therapy":   "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    "Kinesiology Tape":   "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
}

# ----- Catalog definition (consolidated from spreadsheet) -----
# Prices are in cents (e.g. 2900 = $29.00). Variants share base imagery
# unless explicitly given an `image` key.
CATEGORIES = [
    "Hot/Cold Therapy", "Topicals", "Electro Therapy", "Self-Care Tools",
    "Recovery Garments", "Cold Compression", "Recovery Patches",
    "Kinesiology Tape", "Braces", "Exercise Therapy",
]


def kt_2pack_variants():
    # Curated palette: only Black, Beige (formerly Tan), Blue, Pink, Red
    # Each variant carries its own colour-matched image_key so the storefront
    # can swap the main image when the buyer selects a different colour.
    items = [
        ("Black", "HAKT-2RL-BLK", "kt_2pack_black"),
        ("Beige", "HAKT-2RL-TAN", "kt_2pack_tan"),
        ("Blue",  "HAKT-2RL-BLU", "kt_2pack_blue"),
        ("Pink",  "HAKT-2RL-PNK", "kt_2pack_pink"),
        ("Red",   "HAKT-2RL-RED", "kt_2pack_red"),
    ]
    return [
        {"sku": sku, "name": color, "price": 1499, "stockQuantity": 10,
         "attributes": {"color": color}, "image_key": img}
        for color, sku, img in items
    ]


def kt_roll_variants():
    items = [
        ("Black", "HAKT-2RL45-BLK", "kt_roll_black"),
        ("Beige", "HAKT-2RL45-TAN", "kt_roll_tan"),
        ("Blue",  "HAKT-2RL45-BLU", "kt_roll_blue"),
        ("Pink",  "HAKT-2RL45-PNK", "kt_roll_pink"),
        ("Red",   "HAKT-2RL45-RED", "kt_roll_red"),
    ]
    return [
        {"sku": sku, "name": color, "price": 4999, "stockQuantity": 10,
         "attributes": {"color": color}, "image_key": img}
        for color, sku, img in items
    ]


def incrediwear_knee_variants():
    colors = ["Grey", "Black", "Navy", "Red", "Royal"]
    sizes = [("M", "Knee 12-14\""), ("L", "Knee 14-16\""), ("XL", "Knee 16-18\""),
             ("XXL", "Knee 18-22\""), ("XXXL", "Knee 22-26\"")]
    color_prefix = {"Grey": "G70", "Black": "GB70", "Navy": "G70", "Red": "G70", "Royal": "G70"}
    size_codes = {"M": "2", "L": "3", "XL": "4", "XXL": "5", "XXXL": "5b"}
    out = []
    for c in colors:
        for size, _circ in sizes:
            prefix = color_prefix[c]
            base_sku = f"{prefix}{size_codes[size]}"
            sku = base_sku if c in ("Grey", "Black") else f"{base_sku} {c}"
            out.append({
                "sku": sku, "name": f"{c} {size}", "price": 5499,
                "stockQuantity": 5, "attributes": {"color": c, "size": size},
            })
    return out


def incrediwear_ankle_variants():
    colors = ["Grey", "Black"]
    sizes = ["S/M", "L", "XL"]
    skus = {("Grey", "S/M"): "G706", ("Grey", "L"): "G707", ("Grey", "XL"): "G707XL",
            ("Black", "S/M"): "GB706", ("Black", "L"): "GB707", ("Black", "XL"): "GB707XL"}
    return [
        {"sku": skus[(c, s)], "name": f"{c} {s}", "price": 4499, "stockQuantity": 5,
         "attributes": {"color": c, "size": s}} for c in colors for s in sizes
    ]


def incrediwear_elbow_variants():
    colors = ["Grey", "Navy", "Red", "Royal"]
    sizes = ["S/M", "M", "L"]
    suffix = {"Grey": "", "Navy": " Navy", "Red": " Red", "Royal": " Royal"}
    base = {"S/M": "G701", "M": "G701M", "L": "G701b"}
    return [
        {"sku": f"{base[s]}{suffix[c]}", "name": f"{c} {s}", "price": 4499,
         "stockQuantity": 5, "attributes": {"color": c, "size": s}}
        for c in colors for s in sizes
    ]


def incrediwear_hip_variants():
    sides = ["Right", "Left"]
    sizes = ["S", "M", "L", "XL", "XXL"]
    sku_map = {("Right", "S"): "HIP101R", ("Right", "M"): "HIP102R", ("Right", "L"): "HIP103R",
               ("Right", "XL"): "HIP104R", ("Right", "XXL"): "HIP105R",
               ("Left", "S"): "HIP201L", ("Left", "M"): "HIP202L", ("Left", "L"): "HIP203L",
               ("Left", "XL"): "HIP204L", ("Left", "XXL"): "HIP205L"}
    return [
        {"sku": sku_map[(side, sz)], "name": f"{side} {sz}", "price": 8999,
         "stockQuantity": 5, "attributes": {"side": side, "size": sz}}
        for side in sides for sz in sizes
    ]


def shoulder_variants():
    sizes = [("S", "9-11\" bicep"), ("M", "11-13\" bicep"),
             ("L", "13-15\" bicep"), ("XL", "15-18\" bicep")]
    skus = ["GR801", "GR802", "GR803", "GR804"]
    return [
        {"sku": skus[i], "name": s, "price": 8999, "stockQuantity": 5,
         "attributes": {"size": s}} for i, (s, _c) in enumerate(sizes)
    ]


def back_brace_variants():
    sizes = [("S", "Waist 24-29\""), ("M", "Waist 30-33\""), ("L", "Waist 34-37\""),
             ("XL", "Waist 38-44\""), ("XXL", "Waist 45-53\""),
             ("XXXL", "Waist 54-60+\"")]
    skus = ["GR708", "GR709", "GR710", "GR713", "GR714", "GR715"]
    return [
        {"sku": skus[i], "name": s, "price": 9999, "stockQuantity": 5,
         "attributes": {"size": s}} for i, (s, _c) in enumerate(sizes)
    ]


PRODUCTS = [
    # ===== Hot/Cold Therapy (Requine) =====
    {
        "name": "Hot/Cold Compression Sleeve",
        "brand": "Requine Products",
        "category": "Hot/Cold Therapy",
        "description": "Safely and easily treat various parts of arms and legs with 360° of even coverage and compression. Use hot or cold for targeted relief.",
        "visibility": "public", "featured": True,
        "image_key": "compression_sleeve",
        "variants": [
            {"sku": "CS-01", "name": "Size M", "price": 2900, "stockQuantity": 10, "attributes": {"size": "M"}},
            {"sku": "CS-02", "name": "Size L", "price": 2900, "stockQuantity": 10, "attributes": {"size": "L"}},
            {"sku": "CS-03", "name": "Size XL", "price": 2900, "stockQuantity": 10, "attributes": {"size": "XL"}},
            {"sku": "CS-04", "name": "Size XXL", "price": 2900, "stockQuantity": 10, "attributes": {"size": "XXL"}},
        ],
    },
    {
        "name": "Hot/Cold Therapy Flat Mat",
        "brand": "Requine Products",
        "category": "Hot/Cold Therapy",
        "description": "Treat multiple areas of the body and reduce core temperature without compression. 12\" x 18\" flat therapy mat.",
        "visibility": "public",
        "image_key": "flat_mat",
        "variants": [{"sku": "CFM-01", "name": "12\" x 18\"", "price": 3900, "stockQuantity": 10, "attributes": {"size": "12x18"}}],
    },
    # ===== Topicals (Nano Extreme) =====
    {
        "name": "NanoXtreme Topical Pain Relief Cream",
        "brand": "Nano Extreme",
        "category": "Topicals",
        "description": "A cutting-edge topical pain relief cream designed to target pain at its source. NanoXtreme uses advanced nanotechnology to penetrate deep into the skin and deliver natural ingredients efficiently.",
        "visibility": "public",
        "variants": [
            {"sku": "NE-01", "name": "1 oz Trial", "price": 1999, "stockQuantity": 10, "attributes": {"size": "1 oz"}},
            {"sku": "NE-3.3T", "name": "3.3 oz Tube", "price": 4999, "stockQuantity": 10, "attributes": {"size": "3.3 oz tube"}},
            {"sku": "NE-3.3A", "name": "3.3 oz Pump", "price": 4999, "stockQuantity": 10, "attributes": {"size": "3.3 oz pump"}},
            {"sku": "NE-32",   "name": "32 oz Bulk",  "price": 39900, "stockQuantity": 5,  "attributes": {"size": "32 oz"}},
        ],
    },
    # ===== Topicals (Tree Lotion - Non-CBD) =====
    {
        "name": "Recovery Extreme Heating Gel",
        "brand": "Tree Lotion", "category": "Topicals",
        "description": "Formulated to relieve and soothe. Effective after workouts or during massages. Hydrating gel featuring warming essential oils and meadowfoam seed oil.",
        "visibility": "public",
        "image_key": "tree_lotion_heating",
        "variants": [{"sku": "TL-REHG-01", "name": "4 oz", "price": 3000, "stockQuantity": 10, "attributes": {"size": "4 oz"}}],
    },
    {
        "name": "Recovery Extreme Cooling Gel",
        "brand": "Tree Lotion", "category": "Topicals",
        "description": "Formulated to relieve and soothe. Effective after workouts or during massages. Hydrating gel featuring cooling essential oils and meadowfoam seed oil.",
        "visibility": "public",
        "image_key": "tree_lotion_cooling",
        "variants": [{"sku": "TL-RECG-01", "name": "4 oz", "price": 3000, "stockQuantity": 10, "attributes": {"size": "4 oz"}}],
    },
    {
        "name": "Recovery Extreme Sports Cream",
        "brand": "Tree Lotion", "category": "Topicals",
        "description": "Formulated to relieve and soothe after workouts. Hydrating cream featuring cooling and warming essential oils and meadowfoam seed oil.",
        "visibility": "public",
        "variants": [{"sku": "TL-ESC-0", "name": "4 oz", "price": 3000, "stockQuantity": 10, "attributes": {"size": "4 oz"}}],
    },
    # ===== Topicals (Tree Lotion - CBD) =====
    {
        "name": "CBD Recovery Extreme Sports Cream",
        "brand": "Tree Lotion", "category": "Topicals",
        "description": "CBD-infused recovery sports cream with 400 mg of premium CBD. Targeted muscle relief for athletes.",
        "visibility": "member",
        "image_key": "tree_lotion_cbd_cream",
        "variants": [
            {"sku": "TL-RESC-4", "name": "4 oz / 400 mg", "price": 5000, "stockQuantity": 10, "attributes": {"size": "4 oz", "strength": "400 mg"}},
            {"sku": "TL-RESC-8", "name": "8 oz / 400 mg", "price": 8000, "stockQuantity": 10, "attributes": {"size": "8 oz", "strength": "400 mg"}},
        ],
    },
    # ===== Topicals (Extract Labs) =====
    {
        "name": "Extract Labs CBD Muscle & Recovery Lotion",
        "brand": "Extract Labs", "category": "Topicals",
        "description": "CBD muscle and recovery lotion for targeted relief and muscle soothing.",
        "visibility": "member",
        "variants": [{"sku": "EL-MRL-01", "name": "Standard", "price": 9095, "stockQuantity": 10, "attributes": {}}],
    },
    {
        "name": "Extract Labs CBD Muscle & Recovery Roll On",
        "brand": "Extract Labs", "category": "Topicals",
        "description": "CBD-infused roll on for fast targeted muscle and joint relief.",
        "visibility": "member",
        "variants": [{"sku": "EL-MRR-01", "name": "Standard", "price": 8995, "stockQuantity": 10, "attributes": {}}],
    },
    {
        "name": "Extract Labs CBD Muscle & Recovery Cream",
        "brand": "Extract Labs", "category": "Topicals",
        "description": "Premium CBD recovery cream for muscle and joint relief.",
        "visibility": "member",
        "variants": [{"sku": "EL-MRC-01", "name": "Standard", "price": 8995, "stockQuantity": 10, "attributes": {}}],
    },
    # ===== Topicals (Fire & Ice CBD) =====
    {
        "name": "Fire & Ice CBD Isolate Roll On",
        "brand": "Fire & Ice", "category": "Topicals",
        "description": "Fast acting deep-penetrating aching muscle relief and recovery. 500 mg CBD isolate roll on.",
        "visibility": "member",
        "image_key": "fire_ice_roll_on",
        "variants": [{"sku": "FI-Roll-01", "name": "500 mg / 4 oz", "price": 3995, "stockQuantity": 10, "attributes": {"strength": "500 mg"}}],
    },
    {
        "name": "Fire & Ice CBD Isolate Relief Cream",
        "brand": "Fire & Ice", "category": "Topicals",
        "description": "Fast acting deep-penetrating aching muscle relief and recovery. 250 mg CBD isolate relief cream.",
        "visibility": "member",
        "image_key": "fire_ice_relief_cream",
        "variants": [{"sku": "FI-PRC-01", "name": "250 mg / 3.5 oz", "price": 3995, "stockQuantity": 10, "attributes": {"strength": "250 mg"}}],
    },
    # ===== Recovery Garments (Incrediwear) =====
    {
        "name": "Incrediwear Knee Sleeve",
        "brand": "Incrediwear", "category": "Recovery Garments",
        "description": "Bioactive wearable IR sleeve for the knee. Semiconductor-embedded fabric helps provide greater relief than traditional compression by increasing blood flow and lymphatic drainage.",
        "visibility": "public", "featured": True,
        "variants": incrediwear_knee_variants(),
    },
    {
        "name": "Incrediwear Ankle Sleeve",
        "brand": "Incrediwear", "category": "Recovery Garments",
        "description": "Bioactive wearable IR ankle sleeve. Reduces swelling, relieves pain, and restores mobility through targeted, no-compression infrared technology.",
        "visibility": "public",
        "variants": incrediwear_ankle_variants(),
    },
    {
        "name": "Incrediwear Elbow Sleeve",
        "brand": "Incrediwear", "category": "Recovery Garments",
        "description": "Bioactive wearable IR elbow sleeve for muscle and joint recovery. No-compression infrared technology.",
        "visibility": "public",
        "variants": incrediwear_elbow_variants(),
    },
    # ===== Braces (Incrediwear) =====
    {
        "name": "Incrediwear Hip Brace",
        "brand": "Incrediwear", "category": "Braces",
        "description": "Bioactive wearable IR hip brace. Supports hip stability and accelerates recovery through infrared semiconductor technology.",
        "visibility": "public",
        "variants": incrediwear_hip_variants(),
    },
    {
        "name": "Incrediwear Shoulder Brace",
        "brand": "Incrediwear", "category": "Braces",
        "description": "Bioactive wearable IR shoulder brace for muscle and joint recovery.",
        "visibility": "public",
        "variants": shoulder_variants(),
    },
    {
        "name": "Incrediwear Back Brace",
        "brand": "Incrediwear", "category": "Braces",
        "description": "Bioactive wearable IR back brace. Supports lower back recovery with infrared semiconductor technology.",
        "visibility": "public",
        "variants": back_brace_variants(),
    },
    # ===== Electro Therapy (Marc Pro) =====
    {
        "name": "Marc Pro Original",
        "brand": "MarcPro", "category": "Electro Therapy",
        "description": "Professional electrotherapy device for muscle recovery. Used by elite athletes and clinicians worldwide.",
        "visibility": "doctor", "featured": True,
        "variants": [{"sku": "MPRO-01", "name": "Standard", "price": 69999, "stockQuantity": 5, "attributes": {}}],
    },
    {
        "name": "Marc Pro Reusable Electrodes",
        "brand": "MarcPro", "category": "Electro Therapy",
        "description": "Replacement reusable electrodes for the Marc Pro device.",
        "visibility": "public",
        "variants": [
            {"sku": "MPRE-04", "name": "4 Count Pack",  "price": 899,  "stockQuantity": 50, "attributes": {"packSize": "4"}},
            {"sku": "MPRE-10", "name": "10 Count Pack", "price": 7199, "stockQuantity": 50, "attributes": {"packSize": "10"}},
        ],
    },
    # ===== Self-Care Tools (Tiger Tail) =====
    {
        "name": "Tiger Tail Original Muscle Roller",
        "brand": "Tiger Tail", "category": "Self-Care Tools",
        "description": "The classic Tiger Tail muscle roller stick. Used by athletes for self-massage, warm-up, and recovery.",
        "visibility": "public",
        "variants": [
            {"sku": "11TTRC", "name": "11 inch", "price": 3499, "stockQuantity": 10, "attributes": {"size": "11 inch"}},
            {"sku": "18TTRC", "name": "18 inch", "price": 3999, "stockQuantity": 10, "attributes": {"size": "18 inch"}},
            {"sku": "22TTRC", "name": "22 inch", "price": 4499, "stockQuantity": 10, "attributes": {"size": "22 inch"}},
        ],
    },
    {
        "name": "Tiger Cane Acupressure Hook",
        "brand": "Tiger Tail", "category": "Self-Care Tools",
        "description": "Acupressure massage hook for trigger point therapy on hard-to-reach areas.",
        "visibility": "public",
        "variants": [
            {"sku": "TCBLU", "name": "Blue", "price": 2999, "stockQuantity": 10, "attributes": {"color": "Blue"}},
            {"sku": "TCORG", "name": "Orange", "price": 2999, "stockQuantity": 10, "attributes": {"color": "Orange"}},
        ],
    },
    {
        "name": "Tiger Tail Spiky Roller",
        "brand": "Tiger Tail", "category": "Self-Care Tools",
        "description": "Spiky roller for acupressure and myofascial release.",
        "visibility": "public",
        "variants": [{"sku": "ACUROL", "name": "Standard", "price": 1999, "stockQuantity": 10, "attributes": {}}],
    },
    # ===== Self-Care Tools (Sidekick Scraper) =====
    {
        "name": "Sidekick Curve Muscle Scraper",
        "brand": "Sidekick", "category": "Self-Care Tools",
        "description": "Curve muscle scraper tool for myofascial release and recovery.",
        "visibility": "public",
        "variants": [{"sku": "SK-CURVE", "name": "Standard", "price": 6900, "stockQuantity": 10, "attributes": {}}],
    },
    {
        "name": "Sidekick Swerve Muscle Scraper",
        "brand": "Sidekick", "category": "Self-Care Tools",
        "description": "Swerve muscle scraper for deep tissue work.",
        "visibility": "public",
        "variants": [{"sku": "SK-SWERVE", "name": "Standard", "price": 9500, "stockQuantity": 10, "attributes": {}}],
    },
    {
        "name": "Sidekick Echo Muscle Scraper Set",
        "brand": "Sidekick", "category": "Self-Care Tools",
        "description": "Echo muscle scraper set for comprehensive therapy.",
        "visibility": "public",
        "variants": [{"sku": "SK-ECHO", "name": "Standard", "price": 13500, "stockQuantity": 10, "attributes": {}}],
    },
    {
        "name": "Sidekick Eclipse Muscle Scraper",
        "brand": "Sidekick", "category": "Self-Care Tools",
        "description": "Eclipse muscle scraper for professional and at-home use.",
        "visibility": "public",
        "variants": [{"sku": "SK-ECLIPSE", "name": "Standard", "price": 11900, "stockQuantity": 10, "attributes": {}}],
    },
    {
        "name": "Sidekick Bow Muscle Scraper",
        "brand": "Sidekick", "category": "Self-Care Tools",
        "description": "Bow muscle scraper for targeted myofascial therapy.",
        "visibility": "doctor",
        "variants": [{"sku": "SK-BOW", "name": "Standard", "price": 17000, "stockQuantity": 5, "attributes": {}}],
    },
    # ===== Cold Compression (Squid Go) =====
    {
        "name": "Squid Go Control Unit",
        "brand": "Squid Go", "category": "Cold Compression",
        "description": "Squid Go control unit for the cold compression therapy system. Required base for all Squid Go body part attachments.",
        "visibility": "doctor",
        "variants": [{"sku": "SG01-CU", "name": "Standard", "price": 39999, "stockQuantity": 5, "attributes": {}}],
    },
    {
        "name": "Squid Go Body Part Systems",
        "brand": "Squid Go", "category": "Cold Compression",
        "description": "Cold compression therapy attachments for the Squid Go system. Choose the body part attachment best suited to your recovery.",
        "visibility": "doctor",
        "variants": [
            {"sku": "SG02-Ankle",  "name": "Ankle",    "price": 12999, "stockQuantity": 5, "attributes": {"area": "ankle"}},
            {"sku": "SG03-LKS",    "name": "Leg/Knee", "price": 14999, "stockQuantity": 5, "attributes": {"area": "leg-knee"}},
            {"sku": "SG04-Shldr",  "name": "Shoulder", "price": 14999, "stockQuantity": 5, "attributes": {"area": "shoulder"}},
            {"sku": "SG05-Elbow",  "name": "Elbow",    "price": 12999, "stockQuantity": 5, "attributes": {"area": "elbow"}},
            {"sku": "SG06-Wrist",  "name": "Wrist",    "price": 12999, "stockQuantity": 5, "attributes": {"area": "wrist"}},
            {"sku": "SG07-Back",   "name": "Back",     "price": 15999, "stockQuantity": 5, "attributes": {"area": "back"}},
        ],
    },
    # ===== Recovery Patches =====
    {
        "name": "Fire & Ice CBD Transdermal Patch",
        "brand": "Fire & Ice", "category": "Recovery Patches",
        "description": "Transdermal CBD patch for sustained pain relief.",
        "visibility": "member",
        "variants": [{"sku": "FI-TP-01", "name": "Single", "price": 1995, "stockQuantity": 20, "attributes": {}}],
    },
    {
        "name": "CBD Lion Transdermal Patch 4-Pack",
        "brand": "CBD Lion", "category": "Recovery Patches",
        "description": "CBD transdermal patch 4-pack with 40 mg CBD per patch.",
        "visibility": "member",
        "variants": [
            {"sku": "CBDL-01B", "name": "Black", "price": 2499, "stockQuantity": 20, "attributes": {"color": "Black"}},
            {"sku": "CBDL-01T", "name": "Tan",   "price": 2499, "stockQuantity": 20, "attributes": {"color": "Tan"}},
        ],
    },
    # ===== Exercise Therapy (Thera-Band, Norco) =====
    {
        "name": "Thera-Band Resistance Bands",
        "brand": "Thera-band", "category": "Exercise Therapy",
        "description": "Professional resistance bands for rehabilitation and strength training.",
        "visibility": "public",
        "variants": [
            {"sku": "NC7610", "name": "Beginner Pack", "price": 1795, "stockQuantity": 30, "attributes": {"level": "beginner"}},
            {"sku": "NC7611", "name": "Advanced Pack", "price": 1795, "stockQuantity": 30, "attributes": {"level": "advanced"}},
        ],
    },
    {
        "name": "Norco Exercise Ball",
        "brand": "North Coast Medical", "category": "Exercise Therapy",
        "description": "Professional anti-burst exercise/stability ball used in clinical and home rehab.",
        "visibility": "public",
        "variants": [
            {"sku": "NC50100", "name": "45 cm", "price": 1795, "stockQuantity": 20, "attributes": {"size": "45 cm"}},
            {"sku": "NC50101", "name": "55 cm", "price": 1895, "stockQuantity": 20, "attributes": {"size": "55 cm"}},
            {"sku": "NC50102", "name": "65 cm", "price": 2095, "stockQuantity": 20, "attributes": {"size": "65 cm"}},
            {"sku": "NC50103", "name": "75 cm", "price": 2495, "stockQuantity": 20, "attributes": {"size": "75 cm"}},
            {"sku": "NC50104", "name": "85 cm", "price": 2795, "stockQuantity": 20, "attributes": {"size": "85 cm"}},
        ],
    },
    {
        "name": "Norco Foam Roller",
        "brand": "North Coast Medical", "category": "Self-Care Tools",
        "description": "Clinical-grade foam roller for self-myofascial release.",
        "visibility": "public",
        "variants": [
            {"sku": "NC64641-612", "name": "Round 12\"",      "price": 1895, "stockQuantity": 20, "attributes": {"shape": "round", "length": "12 inch"}},
            {"sku": "NC64641-636", "name": "Round 36\"",      "price": 3195, "stockQuantity": 20, "attributes": {"shape": "round", "length": "36 inch"}},
            {"sku": "NC64640-312", "name": "Half Round 12\"", "price": 1095, "stockQuantity": 20, "attributes": {"shape": "half", "length": "12 inch"}},
            {"sku": "NC64640-336", "name": "Half Round 36\"", "price": 2195, "stockQuantity": 20, "attributes": {"shape": "half", "length": "36 inch"}},
        ],
    },
    {
        "name": "Norco Shoulder Pulley",
        "brand": "North Coast Medical", "category": "Self-Care Tools",
        "description": "Door-frame mounted shoulder pulley for range-of-motion exercises.",
        "visibility": "public",
        "variants": [{"sku": "NC52069", "name": "Standard", "price": 1795, "stockQuantity": 20, "attributes": {}}],
    },
    {
        "name": "Bio Blade",
        "brand": "Bio Blade", "category": "Self-Care Tools",
        "description": "Bio Blade IASTM tool for instrument-assisted soft tissue mobilization.",
        "visibility": "doctor",
        "variants": [{"sku": "BB-01", "name": "Standard", "price": 12900, "stockQuantity": 5, "attributes": {}}],
    },
    # ===== Kinesiology Tape (Hampton Adams) =====
    {
        "name": "Hampton Adams Kinesiology Tape — 2 Pack",
        "brand": "Hampton Adams", "category": "Kinesiology Tape",
        "description": "Premium kinesiology tape, 2-pack of 2\"x16ft rolls. Choose your color.",
        "visibility": "public", "featured": True,
        "image_key": "kt_2pack_black",
        "variants": kt_2pack_variants(),
    },
    {
        "name": "Hampton Adams Kinesiology Tape — Clinic Roll 2\" x 45 yd",
        "brand": "Hampton Adams", "category": "Kinesiology Tape",
        "description": "Bulk 2-inch by 45-yard kinesiology tape clinic roll for therapists and trainers.",
        "visibility": "doctor",
        "image_key": "kt_roll_black",
        "variants": kt_roll_variants(),
    },
]


def upload_image(app_name: str, label: str, path: Path) -> str | None:
    """Upload a local image to object storage and return the storage path."""
    if not path.exists():
        print(f"  [WARN] Image file missing for {label}: {path}")
        return None
    ext = path.suffix.lstrip(".").lower()
    content_type = MIME.get(ext, "application/octet-stream")
    storage_path = f"{app_name}/products/{uuid.uuid4().hex}.{ext}"
    with open(path, "rb") as f:
        data = f.read()
    result = put_object(storage_path, data, content_type)
    print(f"  [OK] Uploaded {label}: {result['path']} ({result['size']} bytes)")
    return result["path"]


async def main():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ.get("DB_NAME", "ar360")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    init_storage()
    app_name = os.environ.get("OBJ_STORAGE_APP_NAME", "ar360")

    # 1. Ensure all referenced categories exist
    print("[1] Ensuring categories...")
    cat_coll = db["categories"]
    cat_id_by_name: dict[str, str] = {}
    for cname in CATEGORIES:
        existing = await cat_coll.find_one({"name": cname})
        if existing:
            cat_id_by_name[cname] = str(existing["_id"])
        else:
            res = await cat_coll.insert_one({
                "name": cname,
                "description": f"{cname} products for active recovery",
                "imageUrl": None,
                "productCount": 0,
            })
            cat_id_by_name[cname] = str(res.inserted_id)
            print(f"  [+] Created category {cname}")

    # 2. Upload all referenced images first (cache by key)
    print("[2] Uploading product images to object storage...")
    image_url_by_key: dict[str, str] = {}
    api_url = os.environ.get("PUBLIC_FILE_BASE_URL", "/api/files")
    for key, path in LOCAL_IMAGE_MAP.items():
        storage_path = upload_image(app_name, key, path)
        if storage_path:
            image_url_by_key[key] = f"{api_url}/{storage_path}"

    # 3. Wipe existing products + reset category counts
    print("[3] Wiping existing products...")
    deleted = await db["products"].delete_many({})
    print(f"  [-] Deleted {deleted.deleted_count} legacy products")
    await cat_coll.update_many({}, {"$set": {"productCount": 0}})

    # 4. Insert consolidated products
    print("[4] Inserting consolidated products...")
    inserted = 0
    for prod in PRODUCTS:
        cat_id = cat_id_by_name.get(prod["category"])
        if not cat_id:
            print(f"  [SKIP] Unknown category {prod['category']!r} for {prod['name']!r}")
            continue

        # Resolve product-level image
        if "image_key" in prod and prod["image_key"] in image_url_by_key:
            image_url = image_url_by_key[prod["image_key"]]
        else:
            image_url = STOCK_FALLBACK.get(prod["category"], STOCK_FALLBACK["Self-Care Tools"])

        # Strip helper fields from variants and resolve variant images if any
        clean_variants = []
        for v in prod["variants"]:
            v_copy = {k: val for k, val in v.items() if k != "image_key"}
            if v.get("image_key") and v["image_key"] in image_url_by_key:
                v_copy["imageUrl"] = image_url_by_key[v["image_key"]]
            clean_variants.append(v_copy)

        prices = [v["price"] for v in clean_variants if v.get("price") is not None]
        total_stock = sum(v.get("stockQuantity", 0) for v in clean_variants)

        doc = {
            "name": prod["name"],
            "description": prod["description"],
            "price": min(prices) if prices else 0,
            "imageUrl": image_url,
            "visibility": prod.get("visibility", "public"),
            "categoryId": cat_id,
            "stockQuantity": total_stock,
            "featured": prod.get("featured", False),
            "doctorIds": [],
            "brand": prod.get("brand"),
            "hasVariants": len(clean_variants) > 1,
            "variants": clean_variants,
            "createdAt": datetime.now(timezone.utc),
        }

        await db["products"].insert_one(doc)
        await cat_coll.update_one({"_id": __import__("bson").ObjectId(cat_id)},
                                  {"$inc": {"productCount": 1}})
        inserted += 1
        print(f"  [+] {prod['name']} ({len(clean_variants)} variant{'s' if len(clean_variants) != 1 else ''})")

    print(f"\nDone. Inserted {inserted} consolidated products.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
