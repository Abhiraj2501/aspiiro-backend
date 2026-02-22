import Database from 'better-sqlite3';
import path from 'path';

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
    db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
      'admin@aspiiro.com',
      'admin123', // In production, this would be hashed
      'Aspiiro Admin',
      'admin'
    );
  }

  // Seed some sample products if empty
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (productCount.count === 0) {
    const products = [
      {
        name: 'Oversized "Ghost" Tee',
        description: 'Heavyweight 240GSM cotton, drop shoulder fit.',
        price: 1499,
        discount_price: 1299,
        stock: 50,
        category: 'T-Shirts',
        images: JSON.stringify(['https://picsum.photos/seed/tee1/800/1000']),
        is_new: 1,
        is_sale: 1
      },
      {
        name: 'Aspiiro Cargo Pants',
        description: 'Multi-pocket tactical design with adjustable cuffs.',
        price: 2999,
        discount_price: null,
        stock: 30,
        category: 'Bottoms',
        images: JSON.stringify(['https://picsum.photos/seed/pants1/800/1000']),
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
