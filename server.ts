import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import db, { initDb } from "./server/db.ts";
import authRoutes from "./server/routes/auth.ts";
import adminRoutes from "./server/routes/admin.ts";
import { rateLimit } from "express-rate-limit";
import { authenticateToken, AuthRequest } from "./server/middleware/auth.ts";
import { errorHandler } from "./server/middleware/error.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'development') {
    console.warn("Using dev JWT secret");
  } else {
    throw new Error("JWT_SECRET is required");
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "aspiiro_dev_secret_key";

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

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });
  app.use("/api/", limiter);

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", brand: "Aspiiro" });
  });

  // Product Routes
  app.get("/api/products", (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as any[];
    res.json(products.map((p) => {
      let images = [];
      try {
        images = JSON.parse(p.images);
      } catch (e) {
        images = [];
      }
      return { ...p, images };
    }));
  });

  app.get("/api/products/:id", (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (!product) return res.status(404).json({ error: "Product not found" });
    let images = [];
    try {
      images = JSON.parse(product.images);
    } catch (e) {
      images = [];
    }
    res.json({ ...product, images });
  });

  // Order Tracking Route (Public)
  app.get("/api/orders/:id", (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
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

  app.post("/api/payments/verify", authenticateToken, (req: AuthRequest, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, address, isMock } = req.body;
    
    const finalizeOrder = (paymentStatus: string) => {
      const total = cart.reduce((sum: number, item: { price: number; discount_price?: number; quantity: number }) => sum + (item.discount_price || item.price) * item.quantity, 0);
      const userId = req.user ? req.user.id : null;
      
      const orderResult = db.prepare(`
        INSERT INTO orders (user_id, total, payment_id, payment_status, address)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, total, razorpay_payment_id, paymentStatus, address || 'Guest Address');

      const orderId = orderResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);

      for (const item of cart) {
        insertItem.run(orderId, item.id, item.quantity, item.discount_price || item.price);
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
      }

      return orderId;
    };

    // For demo purposes, allow mock payments to succeed without signature verification
    if (isMock) {
      const orderId = finalizeOrder('paid (mock)');
      return res.json({ status: "success", orderId });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const orderId = finalizeOrder('paid');
      res.json({ status: "success", orderId });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  });

  // Admin routes are now handled by adminRoutes in /server/routes/admin.ts

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error Handler
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aspiiro Server running on http://localhost:${PORT}`);
  });
}

startServer();
