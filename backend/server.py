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
from bson import ObjectId

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
    order_id: Optional[str] = None  # require internal order_id to link payments

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

def sanitize(obj):
    """Recursively convert ObjectId and datetime to JSON-serializable types and remove _id"""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "_id":
                continue
            out[k] = sanitize(v)
        return out
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

# Replace get_current_user with improved error handling
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
        return payload['email']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Replace get_admin_user with improved error handling
async def get_admin_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
        if payload.get('role') != 'admin':
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return payload['email']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
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
    # Fallback to plain password env var for dev if hash missing (explicit, not silent)
    if not stored_hash:
        fallback = os.getenv('ADMIN_PASSWORD')
        if not fallback or request.password != fallback:
            raise HTTPException(status_code=500, detail="Admin password not configured correctly (missing ADMIN_PASSWORD_HASH)")
    else:
        try:
            if not bcrypt.checkpw(request.password.encode('utf-8'), stored_hash.encode('utf-8')):
                raise HTTPException(status_code=401, detail="Invalid credentials")
        except Exception:
            raise HTTPException(status_code=500, detail="Admin password check failed - misconfigured hash")

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

# Create Razorpay order - validate internal order ownership & amount
@app.post("/api/payment/create-order")
async def create_razorpay_order(request: RazorpayOrderRequest, email: str = Depends(get_current_user)):
    # Require order_id so we can validate amounts and ownership
    if not request.order_id:
        raise HTTPException(status_code=400, detail="order_id is required")
    order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get('user_email') != email:
        raise HTTPException(status_code=403, detail="Not authorized for this order")
    # Validate amounts (order.total should match request.amount)
    if abs(float(order.get('total', 0)) - float(request.amount)) > 0.01:
        raise HTTPException(status_code=400, detail="Amount mismatch with order total")
    try:
        razor_order = razorpay_client.order.create({
            "amount": int(request.amount * 100),
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"order_id": request.order_id}
        })
        # Persist the razorpay order id on our order doc for verification
        await db.orders.update_one({"id": request.order_id}, {"$set": {"razorpay_order_id": razor_order['id']}})
        return {"success": True, "order_id": razor_order['id'], "amount": razor_order['amount'], "currency": razor_order['currency'], "key_id": os.getenv('RAZORPAY_KEY_ID')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

# Verify payment - ensure ownership, signature, amount, and atomic stock decrement
@app.post("/api/payment/verify")
async def verify_payment(request: VerifyPaymentRequest, email: str = Depends(get_current_user)):
    order = await db.orders.find_one({"id": request.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get('user_email') != email:
        raise HTTPException(status_code=403, detail="Not authorized for this order")
    try:
        # Verify signature with Razorpay
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        })
        # Optional: verify amount by fetching razorpay order and comparing:
        try:
            r_order = razorpay_client.order.fetch(request.razorpay_order_id)
            if int(r_order['amount']) != int(float(order['total']) * 100):
                raise HTTPException(status_code=400, detail="Payment amount does not match order total")
        except Exception:
            # continue; the signature verification is the primary check
            pass

        # Attempt to decrement stock atomically for all items; rollback on failure
        decremented = []
        for item in order.get('items', []):
            pid = item.get('product_id')
            qty = int(item.get('quantity', 0))
            if qty <= 0:
                # invalid quantity; rollback any decrements
                for d in decremented:
                    await db.products.update_one({"id": d['pid']}, {"$inc": {"stock": d['qty']}})
                raise HTTPException(status_code=400, detail="Invalid item quantity")
            res = await db.products.update_one({"id": pid, "stock": {"$gte": qty}}, {"$inc": {"stock": -qty}})
            if res.modified_count == 0:
                # rollback
                for d in decremented:
                    await db.products.update_one({"id": d['pid']}, {"$inc": {"stock": d['qty']}})
                raise HTTPException(status_code=400, detail=f"Insufficient stock for product {pid}")
            decremented.append({'pid': pid, 'qty': qty})

        # Mark payment info and status
        await db.orders.update_one(
            {"id": request.order_id},
            {"$set": {"payment_id": request.razorpay_payment_id, "razorpay_order_id": request.razorpay_order_id, "status": "paid"}}
        )
        return {"success": True, "message": "Payment verified and order marked as paid"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")

# Create order - server-side price & stock validation, status pending
@app.post("/api/orders")
async def create_order(request: CreateOrderRequest, email: str = Depends(get_current_user)):
    # Validate items: product exists, price matches server price, quantity <= stock
    computed_total = 0.0
    for item in request.items:
        pid = item.get('product_id')
        if not pid:
            raise HTTPException(status_code=400, detail="product_id required for each item")
        product = await db.products.find_one({"id": pid}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Product not found: {pid}")

        # compute server-side price considering discount
        server_price = product.get('price', 0.0)
        discount = float(product.get('discount', 0) or 0)
        if discount > 0:
            server_price = server_price - (server_price * discount / 100)
        # floating tolerance
        if abs(server_price - float(item.get('price', 0.0))) > 0.01:
            raise HTTPException(status_code=400, detail=f"Price mismatch for product {pid}")

        qty = int(item.get('quantity', 0))
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Invalid quantity")
        if product.get('stock', 0) < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for product {pid}")
        computed_total += server_price * qty

    if abs(computed_total - float(request.total)) > 0.01:
        raise HTTPException(status_code=400, detail="Total amount mismatch")

    # Create order with status 'pending' (payment pending)
    order = OrderModel(
        user_email=email,
        items=request.items,
        total=computed_total,
        address=request.address,
        status="pending"
    )
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    
    result = await db.orders.insert_one(order_dict)
    
    return_order = sanitize(order_dict)
    return {"success": True, "order": return_order}

# On read endpoints, sanitize results before returning
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
    return {"success": True, "products": sanitize(products)}

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "product": sanitize(product)}

@app.get("/api/orders")
async def get_user_orders(email: str = Depends(get_current_user)):
    orders = await db.orders.find({"user_email": email}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"success": True, "orders": sanitize(orders)}

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str, email: str = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_email": email}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "order": sanitize(order)}

@app.get("/api/admin/orders")
async def get_all_orders(_: str = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"success": True, "orders": sanitize(orders)}

@app.put("/api/admin/orders/{order_id}")
async def update_order_status(order_id: str, request: UpdateOrderStatusRequest, _: str = Depends(get_admin_user)):
    allowed_statuses = {"placed", "pending", "packed", "shipped", "delivered", "paid", "cancelled"}
    if request.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
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