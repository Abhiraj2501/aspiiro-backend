import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const db = new Database('aspiiro.db');

export function initDb() {
  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Products table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      discount_price REAL,
      stock INTEGER DEFAULT 0,
      category TEXT,
      images TEXT, -- JSON array of URLs
      is_new BOOLEAN DEFAULT 0,
      is_sale BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Orders table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      total REAL NOT NULL,
      status TEXT DEFAULT 'placed',
      payment_id TEXT,
      payment_status TEXT DEFAULT 'pending',
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `).run();

  // Order Items table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `).run();

  // Seed Admin if not exists
  const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
      'admin@aspiiro.com',
      hashedPassword,
      'Aspiiro Admin',
      'admin'
    );
  }

  // Seed some sample products if empty or using old images
  const firstProduct = db.prepare('SELECT images FROM products LIMIT 1').get() as { images: string } | undefined;
  const needsUpdate = !firstProduct || firstProduct.images.includes('picsum.photos');

  if (needsUpdate) {
    db.prepare('DELETE FROM order_items').run();
    db.prepare('DELETE FROM orders').run();
    db.prepare('DELETE FROM products').run();

    const products = [
      {
        name: 'Tricolor Zip Polo',
        description: 'Premium color-blocked polo with a modern zip neck. Red, white, and navy panels.',
        price: 750,
        discount_price: null,
        stock: 45,
        category: 'T-Shirts',
        images: JSON.stringify(['/images/tricolor-polo.jpg']),
        is_new: 1,
        is_sale: 0
      },
      {
        name: 'Sunbeam Zip Hoodie',
        description: 'Vibrant yellow and white contrast zip-up hoodie. Soft knit texture.',
        price: 850,
        discount_price: null,
        stock: 30,
        category: 'Outerwear',
        images: JSON.stringify(['/images/sunbeam-hoodie.jpg']),
        is_new: 1,
        is_sale: 0
      },
      {
        name: 'SRYC Bear Hoodie',
        description: 'Brown and white raglan hoodie featuring a cool bear graphic with "SRYC" branding.',
        price: 899,
        discount_price: null,
        stock: 25,
        category: 'Outerwear',
        images: JSON.stringify(['/images/bear-hoodie.jpg']),
        is_new: 1,
        is_sale: 0
      },
      {
        name: 'Classic Stripe Zip',
        description: 'Timeless black and white striped zip-up sweatshirt. Versatile streetwear essential.',
        price: 799,
        discount_price: null,
        stock: 40,
        category: 'Outerwear',
        images: JSON.stringify(['/images/stripe-zip.jpg']),
        is_new: 1,
        is_sale: 0
      },
      {
        name: 'Crimson Plaid Shirt',
        description: 'Classic red plaid flannel shirt. Premium cotton for a comfortable fit.',
        price: 650,
        discount_price: null,
        stock: 50,
        category: 'Shirts',
        images: JSON.stringify(['/images/plaid-shirt.jpg']),
        is_new: 1,
        is_sale: 0
      }
    ];

    const insert = db.prepare(`
      INSERT INTO products (name, description, price, discount_price, stock, category, images, is_new, is_sale)
      VALUES (@name, @description, @price, @discount_price, @stock, @category, @images, @is_new, @is_sale)
    `);

    for (const p of products) {
      insert.run(p);
    }
  }

  console.log('Database initialized successfully.');
}

export default db;
