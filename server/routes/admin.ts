import express from "express";
import { z } from "zod";
import db from "../db.ts";
import { productSchema } from "../schemas.ts";
import { authenticateToken, isAdmin } from "../middleware/auth.ts";

const router = express.Router();

router.use(authenticateToken, isAdmin);

router.get("/orders", (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  
  const ordersWithItems = orders.map((order: { id: number }) => {
    const items = db.prepare(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);
    return { ...order, items };
  });
  
  res.json(ordersWithItems);
});

router.post("/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true });
});

router.post("/products", (req, res) => {
  try {
    const { name, description, price, discount_price, stock, category, images, is_new, is_sale } = productSchema.parse(req.body);
    const result = db.prepare(`
      INSERT INTO products (name, description, price, discount_price, stock, category, images, is_new, is_sale)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, price, discount_price, stock, category, JSON.stringify(images), is_new ? 1 : 0, is_sale ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
