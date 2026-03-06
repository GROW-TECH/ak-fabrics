import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "ak_fabrics_secret_key";

export interface AuthRequest extends Request {
  shop?: any;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  console.log("AUTH HEADER:", authHeader); // 👈 ADD THIS

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.shop = decoded;
    next();
  } catch (err: any) {
  console.log("JWT VERIFY ERROR:", err.message);
  return res.status(401).json({ error: err.message });
}

};