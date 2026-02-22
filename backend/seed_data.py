import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_database():
    print("Seeding database with sample products...")
    
    await db.products.delete_many({})
    
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Urban Shadow Hoodie",
            "description": "Premium heavyweight cotton hoodie with minimalist design. Features dropped shoulders and a relaxed fit perfect for street style.",
            "price": 3499.00,
            "discount": 0,
            "category": "Hoodies",
            "sizes": ["S", "M", "L", "XL", "XXL"],
            "stock": 50,
            "images": [
                "https://images.pexels.com/photos/17756714/pexels-photo-17756714.jpeg",
                "https://images.pexels.com/photos/7709608/pexels-photo-7709608.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": True,
            "is_on_sale": False
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Blackout Tee",
            "description": "Essential crew neck t-shirt in premium cotton. Clean lines, perfect fit. The foundation of any streetwear wardrobe.",
            "price": 1299.00,
            "discount": 20,
            "category": "T-Shirts",
            "sizes": ["S", "M", "L", "XL"],
            "stock": 100,
            "images": [
                "https://images.pexels.com/photos/8148576/pexels-photo-8148576.jpeg",
                "https://images.pexels.com/photos/5325899/pexels-photo-5325899.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": False,
            "is_on_sale": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Utility Cargo Pants",
            "description": "Technical cargo pants with multiple pockets. Durable fabric with modern fit. Function meets style.",
            "price": 4299.00,
            "discount": 15,
            "category": "Pants",
            "sizes": ["28", "30", "32", "34", "36"],
            "stock": 35,
            "images": [
                "https://images.pexels.com/photos/9695913/pexels-photo-9695913.jpeg",
                "https://images.pexels.com/photos/7255427/pexels-photo-7255427.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": True,
            "is_on_sale": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ghost White Oversized Tee",
            "description": "Oversized fit t-shirt in premium cotton. Dropped shoulders, elongated hem. Statement piece.",
            "price": 1499.00,
            "discount": 0,
            "category": "T-Shirts",
            "sizes": ["M", "L", "XL", "XXL"],
            "stock": 75,
            "images": [
                "https://images.pexels.com/photos/8148576/pexels-photo-8148576.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": True,
            "is_on_sale": False
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Storm Black Hoodie",
            "description": "Classic pullover hoodie with kangaroo pocket. Brushed fleece interior for comfort.",
            "price": 2999.00,
            "discount": 25,
            "category": "Hoodies",
            "sizes": ["S", "M", "L", "XL"],
            "stock": 40,
            "images": [
                "https://images.pexels.com/photos/7709608/pexels-photo-7709608.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": False,
            "is_on_sale": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Tactical Joggers",
            "description": "Modern joggers with tapered fit. Side zip pockets and adjustable cuffs.",
            "price": 3799.00,
            "discount": 0,
            "category": "Pants",
            "sizes": ["28", "30", "32", "34"],
            "stock": 30,
            "images": [
                "https://images.pexels.com/photos/7255427/pexels-photo-7255427.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": True,
            "is_on_sale": False
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Minimal Logo Tee",
            "description": "Subtle branding on premium cotton. Clean aesthetic, comfortable fit.",
            "price": 1199.00,
            "discount": 30,
            "category": "T-Shirts",
            "sizes": ["S", "M", "L", "XL"],
            "stock": 80,
            "images": [
                "https://images.pexels.com/photos/5325899/pexels-photo-5325899.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": False,
            "is_on_sale": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Tech Zip Hoodie",
            "description": "Technical zip-up hoodie with performance fabric. Moisture-wicking and breathable.",
            "price": 4499.00,
            "discount": 0,
            "category": "Hoodies",
            "sizes": ["M", "L", "XL", "XXL"],
            "stock": 25,
            "images": [
                "https://images.pexels.com/photos/17756714/pexels-photo-17756714.jpeg"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_new_arrival": True,
            "is_on_sale": False
        }
    ]
    
    await db.products.insert_many(products)
    
    print(f"✓ Successfully seeded {len(products)} products")
    print("✓ Database ready!")

if __name__ == "__main__":
    asyncio.run(seed_database())
