"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = "ak_fabrics_secret_key";
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("AUTH HEADER:", authHeader); // 👈 ADD THIS
    if (!authHeader) {
        return res.status(401).json({ error: "Access denied" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.shop = decoded;
        next();
    }
    catch (err) {
        console.log("JWT VERIFY ERROR:", err.message);
        return res.status(401).json({ error: err.message });
    }
};
exports.authenticate = authenticate;
