// server/src/routes/users.js
import { Router } from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';

import { auth } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

/* =========================
   เตรียมโฟลเดอร์ uploads/avatars
   ========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// โฟลเดอร์ uploads อยู่ที่ server/uploads (ดูที่ index.js ก็ใช้ตำแหน่งนี้)
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const avatarsDir  = path.join(uploadsRoot, 'avatars');
fs.mkdirSync(uploadsRoot, { recursive: true });
fs.mkdirSync(avatarsDir,  { recursive: true });

// ตั้งค่า multer ให้บันทึกไฟล์ลงดิสก์ในโฟลเดอร์ avatars
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => {
    // กันชื่อชนกัน: เวลา-สุ่ม-นามสกุลเดิม
    const ext = path.extname(file.originalname || '').toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype || '');
    cb(ok ? null : new Error('รองรับเฉพาะไฟล์รูปภาพ (jpg, png, webp, gif)'), ok);
  },
});

/* =========================
   GET /api/users/me  (ต้อง auth)
   ========================= */
router.get('/me', auth, async (req, res) => {
  // NOTE: ใน middleware ใส่ req.user = { id, email, role }
  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

  const isAdmin = user.role === 'admin';
  return res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl || '',
    role: user.role || 'user',
    isAdmin,
  });
});

/* =========================
   PUT /api/users/me  (อัปเดตชื่อ/เบอร์/ลิงก์ avatar)
   ========================= */
router.put('/me', auth, async (req, res) => {
  const { name, phone, avatarUrl } = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

  if (typeof name === 'string') user.name  = name.trim();
  if (typeof phone === 'string') user.phone = phone.trim();
  if (typeof avatarUrl === 'string') user.avatarUrl = avatarUrl.trim(); // เผื่อกรณีอยากแก้ตรงๆ

  await user.save();
  return res.json({ message: 'บันทึกสำเร็จ' });
});

/* =========================
   PUT /api/users/password (เปลี่ยนรหัสผ่าน)
   body: { currentPassword, newPassword }
   ========================= */
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านปัจจุบัน และรหัสผ่านใหม่' });
  }

  // ต้อง select('+password') ถึงจะได้ฟิลด์ password ออกมา
  const user = await User.findById(req.user.id).select('+password');
  if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

  const ok = await bcrypt.compare(String(currentPassword), user.password || '');
  if (!ok) return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();

  return res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
});

/* =========================
   POST /api/users/avatar (อัปโหลดรูปโปรไฟล์)
   field name: avatar
   ========================= */
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

  // ลบไฟล์เดิมออก ถ้าเป็นของในโฟลเดอร์ /uploads/avatars เท่านั้น (กันลบลิงก์ภายนอก)
  try {
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(uploadsRoot, user.avatarUrl.replace('/uploads/', ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  } catch { /* ignore */ }

  // ตั้งค่า url ใหม่
  const filename = req.file?.filename;
  if (!filename) return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });

  user.avatarUrl = `/uploads/avatars/${filename}`;
  await user.save();

  return res.json({
    message: 'อัปโหลดรูปสำเร็จ',
    avatarUrl: user.avatarUrl,
  });
});

/* =========================
   DELETE /api/users/avatar (ลบรูปโปรไฟล์)
   ========================= */
router.delete('/avatar', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

  // ลบไฟล์บนดิสก์ถ้าเป็นของเราเอง
  try {
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const filePath = path.join(uploadsRoot, user.avatarUrl.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch { /* ignore */ }

  user.avatarUrl = '';
  await user.save();

  return res.json({ message: 'ลบรูปโปรไฟล์แล้ว', avatarUrl: '' });
});

export default router;
