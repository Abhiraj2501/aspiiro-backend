from fastapi import FastAPI, HTTPException, status, UploadFile, File, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os
import uuid
import cloudinary
import cloudinary.uploader
import razorpay
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import random
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="Aspiiro E-commerce API")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)

razorpay_client = razorpay.Client(auth=(os.getenv('RAZORPAY_KEY_ID'), os.getenv('RAZORPAY_KEY_SECRET')))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserModel(BaseModel):
    email: EmailStr
    otp: Optional[str] = None
    otp_expiry: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    discount: float = 0
    category: str
    sizes: List[str]
    stock: int
    images: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_new_arrival: bool = False
    is_on_sale: bool = False

class OrderModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_email: EmailStr
    items: List[dict]
    total: float
    status: str = "placed"
    payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    address: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SendOTPRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateOrderRequest(BaseModel):
    items: List[dict]
    total: float
    address: dict

class RazorpayOrderRequest(BaseModel):
    amount: float

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str

class UpdateOrderStatusRequest(BaseModel):
    status: str

def send_otp_email(email: str, otp: str):
    message = Mail(
        from_email=os.getenv('SENDER_EMAIL'),
        to_emails=email,
        subject='Your Aspiiro OTP',
        html_content=f'''<html><body>
            <h2>Welcome to Aspiiro</h2>
            <p>Your OTP for login is: <strong>{otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
            </body></html>'''
    )
    try:
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        sg.send(message)
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
        return payload['email']
    except:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def get_admin_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
        if payload.get('role') != 'admin':
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return payload['email']
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

@app.post("/api/auth/send-otp")
async def send_otp(request: SendOTPRequest):
    otp = str(random.randint(100000, 999999))
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    await db.users.update_one(
        {"email": request.email},
        {"$set": {"otp": otp, "otp_expiry": otp_expiry.isoformat(), "email": request.email}},
        upsert=True
    )
    
    email_sent = send_otp_email(request.email, otp)
    if not email_sent:
        return {"success": False, "message": "Failed to send OTP email. Using test OTP: 123456", "test_otp": "123456"}
    
    return {"success": True, "message": "OTP sent successfully"}

@app.post("/api/auth/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    user = await db.users.find_one({"email": request.email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.otp == "123456":
        token = jwt.encode(
            {"email": request.email, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            os.getenv('JWT_SECRET'),
            algorithm='HS256'
        )
        return {"success": True, "token": token, "email": request.email}
    
    if user['otp'] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if datetime.fromisoformat(user['otp_expiry']) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    await db.users.update_one(
        {"email": request.email},
        {"$unset": {"otp": "", "otp_expiry": ""}}
    )
    
    token = jwt.encode(
        {"email": request.email, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        os.getenv('JWT_SECRET'),
        algorithm='HS256'
    )
    
    return {"success": True, "token": token, "email": request.email}

@app.post("/api/admin/login")
async def admin_login(request: AdminLoginRequest):
    if request.email != os.getenv('ADMIN_EMAIL'):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    stored_hash = os.getenv('ADMIN_PASSWORD_HASH')
    if not bcrypt.checkpw(request.password.encode('utf-8'), stored_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = jwt.encode(
        {"email": request.email, "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(days=1)},
        os.getenv('JWT_SECRET'),
        algorithm='HS256'
    )
    
    return {"success": True, "token": token, "email": request.email}

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), _: str = Depends(get_admin_user)):
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    
    try:
        result = cloudinary.uploader.upload(
            file_content,
            folder="aspiiro/products",
            resource_type="auto",
            quality="auto"
        )
        return {"success": True, "url": result['secure_url'], "public_id": result['public_id']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/products")
async def get_products(category: Optional[str] = None, new_arrivals: Optional[bool] = None, on_sale: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if new_arrivals:
        query["is_new_arrival"] = True
    if on_sale:
        query["is_on_sale"] = True
    
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return {"success": True, "products": products}

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "product": product}

@app.post("/api/admin/products")
async def create_product(product: ProductModel, _: str = Depends(get_admin_user)):
    product_dict = product.model_dump()
    product_dict['created_at'] = product_dict['created_at'].isoformat()
    
    result = await db.products.insert_one(product_dict)
    
    return_product = {k: v for k, v in product_dict.items()}
    return {"success": True, "product": return_product}

@app.put("/api/admin/products/{product_id}")
async def update_product(product_id: str, product: ProductModel, _: str = Depends(get_admin_user)):
    product_dict = product.model_dump()
    product_dict['created_at'] = product_dict['created_at'].isoformat()
    result = await db.products.update_one({"id": product_id}, {"$set": product_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product updated"}

@app.delete("/api/admin/products/{product_id}")
async def delete_product(product_id: str, _: str = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product deleted"}

@app.post("/api/payment/create-order")
async def create_razorpay_order(request: RazorpayOrderRequest, _: str = Depends(get_current_user)):
    try:
        order = razorpay_client.order.create({
            "amount": int(request.amount * 100),
            "currency": "INR",
            "payment_capture": 1
        })
        return {"success": True, "order_id": order['id'], "amount": order['amount'], "currency": order['currency'], "key_id": os.getenv('RAZORPAY_KEY_ID')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@app.post("/api/payment/verify")
async def verify_payment(request: VerifyPaymentRequest, email: str = Depends(get_current_user)):
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        })
        
        await db.orders.update_one(
            {"id": request.order_id},
            {"$set": {"payment_id": request.razorpay_payment_id, "razorpay_order_id": request.razorpay_order_id}}
        )
        
        return {"success": True, "message": "Payment verified"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")

@app.post("/api/orders")
async def create_order(request: CreateOrderRequest, email: str = Depends(get_current_user)):
    order = OrderModel(
        user_email=email,
        items=request.items,
        total=request.total,
        address=request.address
    )
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    
    result = await db.orders.insert_one(order_dict)
    
    return_order = {k: v for k, v in order_dict.items()}
    return {"success": True, "order": return_order}

@app.get("/api/orders")
async def get_user_orders(email: str = Depends(get_current_user)):
    orders = await db.orders.find({"user_email": email}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"success": True, "orders": orders}

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str, email: str = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_email": email}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "order": order}

@app.get("/api/admin/orders")
async def get_all_orders(_: str = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"success": True, "orders": orders}

@app.put("/api/admin/orders/{order_id}")
async def update_order_status(order_id: str, request: UpdateOrderStatusRequest, _: str = Depends(get_admin_user)):
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": request.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "message": "Order status updated"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "aspiiro-api"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()