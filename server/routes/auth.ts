import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import db from "../db.ts";
import { signupSchema, loginSchema, updateProfileSchema } from "../schemas.ts";
import { authenticateToken, AuthRequest } from "../middleware/auth.ts";

const router = express.Router();
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'development') {
    console.warn("Using dev JWT secret");
  } else {
    throw new Error("JWT_SECRET is required");
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "aspiiro_dev_secret_key";

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, phone, address } = signupSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password, name, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, hashedPassword, name, phone, address);
    
    const user = db.prepare('SELECT id, email, name, role, phone, address FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    const err = error as { message: string };
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      isMatch = password === user.password;
      if (isMatch) {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
      }
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: userWithoutPassword, token });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/update-profile", authenticateToken, (req: AuthRequest, res) => {
  try {
    const { name, phone, address } = updateProfileSchema.parse(req.body);
    const id = req.user!.id;
    db.prepare('UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?').run(name, phone, address, id);
    const user = db.prepare('SELECT id, email, name, role, phone, address FROM users WHERE id = ?').get(id);
    res.json(user);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
