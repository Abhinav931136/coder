import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import type { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret =
  process.env.JWT_SECRET ||
  "your-super-secret-jwt-key-change-in-production-2024";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as any) || "7d";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    email_verified: boolean;
  };
}

export interface JWTPayload {
  user_id: number;
  username: string;
  email: string;
  role: string;
  email_verified: boolean;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Compare password
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Extract token from Authorization header
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Middleware to require authentication
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token required",
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  req.user = {
    id: decoded.user_id,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role,
    email_verified: decoded.email_verified,
  };

  next();
}

// Middleware to require admin access
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  requireAuth(req, res, () => {
    if (
      !req.user ||
      !["platform_admin", "instructor"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }
    next();
  });
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

// Validate username format
export function isValidUsername(username: string): boolean {
  return (
    username.length >= 3 &&
    username.length <= 50 &&
    /^[a-zA-Z0-9_]+$/.test(username)
  );
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

// Escape string for safe use in RegExp
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Generate secure random token
import { randomBytes } from "crypto";
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}
