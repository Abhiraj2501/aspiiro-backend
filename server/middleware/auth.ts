import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'development') {
    console.warn("Using dev JWT secret");
  } else {
    throw new Error("JWT_SECRET is required");
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "aspiiro_dev_secret_key";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
}

export function isAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}
