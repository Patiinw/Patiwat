// server/src/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { JWT_SECRET } from '../config.js';

const router = Router();

/** REGISTER (เหมือนเดิม; ย่อไว้) */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    const phoneOk = /^0\d{9}$/.test(String(phone).trim());
    if (!phoneOk) return res.status(400).json({ message: 'เบอร์โทรศัพท์ไม่ถูกต้อง' });

    const emailNorm = String(email).trim().toLowerCase();
    const emailComRx = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$/i;
    if (!emailComRx.test(emailNorm)) {
      return res.status(400).json({ message: 'อีเมลต้องอยู่ในรูปแบบ name@example.com และลงท้ายด้วย .com เท่านั้น' });
    }

    const existed = await User.findOne({ email: emailNorm });
    if (existed) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      password: hashed,
      phone: String(phone).trim(),
      role: 'user',
    });

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role || 'user', isAdmin: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'สมัครสำเร็จ',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'user',
        isAdmin: false,
      },
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
    }
    console.error(e);
    return res.status(500).json({ message: 'สมัครสมาชิกไม่สำเร็จ' });
  }
});

/**
 * ✅ ใช้ endpoint เดียว /api/auth/login สำหรับ “ผู้ใช้ทั่วไป + ผู้ดูแลระบบ”
 * - ยกเลิกการบล็อก role=admin ที่เคยมี
 * - รองรับ legacy plaintext password (จะ migrate เป็น bcrypt อัตโนมัติ)
 * - ใส่ isAdmin ใน JWT และ response
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    const stored = user.password || '';
    const looksHashed = /^\$2[aby]\$/.test(stored);
    let ok = false;

    if (looksHashed) {
      ok = await bcrypt.compare(password, stored);
    } else {
      if (password === stored) {
        ok = true;
        user.password = await bcrypt.hash(password, 10); // migrate
        await user.save();
      }
    }
    if (!ok) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    const role = user.role || 'user';
    const isAdmin = role === 'admin';

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role, isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role,
        isAdmin,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เข้าสู่ระบบไม่สำเร็จ' });
  }
});

export default router;
