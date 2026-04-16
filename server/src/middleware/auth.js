// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

/**
 * ตรวจสอบโทเค็นจาก Authorization: Bearer <token>
 * แล้วแนบข้อมูลผู้ใช้ไว้ที่ req.user
 */
export function auth(req, res, next) {
  try {
    const authz = req.headers.authorization || '';
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });

    const payload = jwt.verify(token, JWT_SECRET);

    // รองรับทั้งกรณีมี/ไม่มีฟิลด์เหล่านี้ใน JWT
    const role = payload.role || (payload.isAdmin ? 'admin' : 'user');

    req.user = {
      id: payload.sub,
      email: payload.email || '',
      role,
      isAdmin: role === 'admin' || !!payload.isAdmin,
    };

    return next();
  } catch (e) {
    return res.status(401).json({ message: 'โทเค็นไม่ถูกต้อง' });
  }
}

/** ต้องเป็นผู้ดูแลระบบเท่านั้น */
export function isAdmin(req, res, next) {
  if (!(req.user?.isAdmin || req.user?.role === 'admin')) {
    return res.status(403).json({ message: 'ต้องเป็นผู้ดูแลระบบ' });
  }
  return next();
}

/** สำหรับผู้ใช้ทั่วไปเท่านั้น (ไม่ใช่แอดมิน) */
export function isUser(req, res, next) {
  if (req.user?.role !== 'user' || req.user?.isAdmin) {
    return res.status(403).json({ message: 'สำหรับผู้ใช้ทั่วไปเท่านั้น' });
  }
  return next();
}

/** อนุญาตตามรายชื่อ role ที่กำหนด */
export function allowRoles(...roles) {
  return (req, res, next) => {
    const role = req.user?.isAdmin ? 'admin' : req.user?.role;
    if (!roles.includes(role)) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    return next();
  };
}
