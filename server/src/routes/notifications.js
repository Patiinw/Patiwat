import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

const router = Router();


// =========================
// 🔔 GET notifications
// =========================
router.get('/', auth, async (req, res) => {
  try {
    const onlyUnread = String(req.query.onlyUnread || '') === '1';
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));

    const filter = {
      $or: [
        { recipient: req.user.id },
        { isBroadcast: true }
      ]
    };

    if (onlyUnread) filter.read = false;

    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error('[GET /api/notifications]', e);
    res.status(500).json({ message: 'โหลดแจ้งเตือนไม่สำเร็จ' });
  }
});


// =========================
// 🔔 Mark one as read
// =========================
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const n = await Notification.findOneAndUpdate(
      { _id: id, $or: [{ recipient: req.user.id }, { isBroadcast: true }] },
      { $set: { read: true } },
      { new: true }
    );

    if (!n) return res.status(404).json({ message: 'ไม่พบแจ้งเตือน' });

    res.json(n);
  } catch (e) {
    console.error('[PUT /api/notifications/:id/read]', e);
    res.status(500).json({ message: 'อัปเดตสถานะไม่สำเร็จ' });
  }
});


// =========================
// 🔔 Mark all as read
// =========================
router.put('/read-all', auth, async (req, res) => {
  try {
    const { modifiedCount } = await Notification.updateMany(
      {
        $or: [
          { recipient: req.user.id },
          { isBroadcast: true }
        ],
        read: false
      },
      { $set: { read: true } }
    );

    res.json({ ok: true, updated: modifiedCount });
  } catch (e) {
    console.error('[PUT /api/notifications/read-all]', e);
    res.status(500).json({ message: 'อัปเดตทั้งหมดไม่สำเร็จ' });
  }
});


// =========================
// 👑 SEND to specific user
// =========================
router.post('/send', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { recipient, title, message, type = 'system' } = req.body;

    if (!recipient) {
      return res.status(400).json({ message: 'ต้องระบุ recipient' });
    }

    const notification = await Notification.create({
      recipient,
      title,
      message,
      type,
      isBroadcast: false,
    });

    // ⭐ realtime (ส่งเฉพาะ user)
    const io = req.app.get('io');
    if (io) {
      io.to(recipient.toString()).emit('notification', {
        title,
        message,
      });
    }

    res.json(notification);
  } catch (e) {
    console.error('[POST /api/notifications/send]', e);
    res.status(500).json({ message: 'ส่งแจ้งเตือนไม่สำเร็จ' });
  }
});


// =========================
// 👑 BROADCAST (ทุก user)
// =========================
router.post('/broadcast', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { title, message, type = 'system' } = req.body;

    const notification = await Notification.create({
      isBroadcast: true,
      title,
      message,
      type,
    });

    // ⭐ realtime (ส่งทุกคน)
    const io = req.app.get('io');
    if (io) {
      io.emit('notification', {
        title,
        message,
      });
    }

    res.json({
      message: 'ส่งแจ้งเตือนถึงทุกคนแล้ว',
      notification
    });

  } catch (e) {
    console.error('[POST /api/notifications/broadcast]', e);
    res.status(500).json({ message: 'broadcast ไม่สำเร็จ' });
  }
});

export default router;