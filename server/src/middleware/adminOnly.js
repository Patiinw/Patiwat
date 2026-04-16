// server/src/middleware/adminOnly.js
export function adminOnly(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'ต้องเป็นผู้ดูแลระบบ' });
    }
    next();
  } catch {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
  }
}
