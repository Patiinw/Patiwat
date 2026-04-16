// server/src/routes/admin.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import Post from '../models/Post.js';

const adminRouter = express.Router();

// POST /api/admin/login
adminRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +role');

    if (!user) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const passwordOK =
      typeof user.comparePassword === 'function'
        ? await user.comparePassword(password)
        : await bcrypt.compare(password, user.password);

    if (!passwordOK) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isAdmin =
      user.isAdmin === true ||
      (user.role && String(user.role).toLowerCase() === 'admin');

    if (!isAdmin) {
      return res.status(403).json({ message: 'ไม่ใช่ผู้ดูแลระบบ' });
    }

    const token =
      typeof user.generateJWT === 'function'
        ? user.generateJWT()
        : jwt.sign(
            { id: user._id, isAdmin: true },
            process.env.JWT_SECRET || 'dev-secret-change-me',
            { expiresIn: '7d' }
          );

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isAdmin: true,
      },
    });
  } catch (err) {
    console.error('ADMIN /login error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/admin/posts
adminRouter.get('/posts', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const { q = '' } = req.query;
    const filter = {};

    if (q && String(q).trim()) {
      const safe = String(q).trim().replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      filter.$or = [
        { title: rx },
        { category: rx },
        { tags: rx },
      ];
    }

    const [items, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    return res.json({
      items,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('ADMIN GET /posts error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/admin/posts/:id
adminRouter.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'ไม่พบกระทู้' });
    }
    await post.deleteOne();
    return res.json({ message: 'ลบกระทู้แล้ว' });
  } catch (err) {
    console.error('ADMIN DELETE /posts/:id error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

export default adminRouter;
