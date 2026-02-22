import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb } from "./server/db";
import db from "./server/db";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database
  initDb();

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", brand: "Aspiiro" });
  });

  // Product Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    res.json(products.map((p: any) => ({ ...p, images: JSON.parse(p.images) })));
  });

  app.get("/api/products/:id", (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ ...product, images: JSON.parse(product.images) });
  });

  // Payment Routes
  app.post("/api/payments/create-order", async (req, res) => {
    const { amount, currency = "INR" } = req.body;
    try {
      const order = await razorpay.orders.create({
        amount: amount * 100, // Razorpay expects paise
        currency,
        receipt: `receipt_${Date.now()}`,
      });
      res.json(order);
    } catch (error) {
      console.error("Razorpay error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.post("/api/payments/verify", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, address } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Create Order in DB
      const total = cart.reduce((sum: number, item: any) => sum + (item.discount_price || item.price) * item.quantity, 0);
      
      const orderResult = db.prepare(`
        INSERT INTO orders (user_id, total, payment_id, payment_status, address)
        VALUES (?, ?, ?, ?, ?)
      `).run(null, total, razorpay_payment_id, 'paid', address || 'Guest Address');

      const orderId = orderResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);

      for (const item of cart) {
        insertItem.run(orderId, item.id, item.quantity, item.discount_price || item.price);
        // Update stock
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
      }

      res.json({ status: "success", orderId });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  });

  // Admin Routes
  app.get("/api/admin/orders", (req, res) => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    res.json(orders);
  });

  app.post("/api/admin/orders/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/products", (req, res) => {
    const { name, description, price, discount_price, stock, category, images, is_new, is_sale } = req.body;
    const result = db.prepare(`
      INSERT INTO products (name, description, price, discount_price, stock, category, images, is_new, is_sale)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, price, discount_price, stock, category, JSON.stringify(images), is_new ? 1 : 0, is_sale ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/admin/products/:id", (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aspiiro Server running on http://localhost:${PORT}`);
  });
}

startServer();
