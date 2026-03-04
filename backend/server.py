from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from routes.auth import router as auth_router
from routes.products import router as products_router
from routes.categories import router as categories_router
from routes.cart import router as cart_router
from routes.orders import router as orders_router
from routes.doctors import router as doctors_router
from routes.testimonials import router as testimonials_router
from routes.discount_codes import router as discount_codes_router
from routes.admin import router as admin_router
from routes.payments import router as payments_router
from services.database import connect_db, close_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[STARTUP] Starting FastAPI server...")
    await connect_db()
    print("[STARTUP] Database connected")
    yield
    # Shutdown
    await close_db()
    print("[SHUTDOWN] Database disconnected")

app = FastAPI(
    title="AR360 API",
    description="Active Recovery 360 E-Commerce Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoints
@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/health")
async def api_health_check():
    return {"status": "ok"}

# Include routers
app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(products_router, prefix="/api", tags=["Products"])
app.include_router(categories_router, prefix="/api", tags=["Categories"])
app.include_router(cart_router, prefix="/api", tags=["Cart"])
app.include_router(orders_router, prefix="/api", tags=["Orders"])
app.include_router(doctors_router, prefix="/api", tags=["Doctors"])
app.include_router(testimonials_router, prefix="/api", tags=["Testimonials"])
app.include_router(discount_codes_router, prefix="/api", tags=["Discount Codes"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(payments_router, prefix="/api", tags=["Payments"])

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
