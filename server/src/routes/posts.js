// server/src/routes/posts.js
import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import { Post, SALAD_CATEGORIES } from '../models/Post.js';
import { DeletedPost } from '../models/DeletedPost.js';

const router = Router();
const isValidId = (id) => !!id && mongoose.Types.ObjectId.isValid(id);

// helper กัน regex injection
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* =========================
   เหตุผลการรายงาน (รองรับ code & label)
   ========================= */
const REASON_CODES = ['spam', 'abuse', 'inappropriate', 'ads', 'illegal', 'other'];
const REASON_LABELS = {
  spam:          'สแปม',
  abuse:         'คำหยาบคาย/ดูหมิ่น',
  inappropriate: 'เนื้อหาไม่เหมาะสม',
  ads:           'โฆษณา/เชิญชวน',
  illegal:       'ผิดกฎหมาย',
  other:         'อื่นๆ',
};
// กลับด้าน label->code เพื่อแมตช์กรณีส่งเป็นภาษาไทยมา
const LABEL_TO_CODE = Object.fromEntries(
  Object.entries(REASON_LABELS).map(([code, label]) => [label, code])
);
function normalizeReason(raw) {
  const v = String(raw || '').trim();
  if (!v) return 'other';
  if (REASON_CODES.includes(v)) return v;        // ส่งมาเป็น code
  if (LABEL_TO_CODE[v]) return LABEL_TO_CODE[v]; // ส่งมาเป็น label ไทย
  return 'other';
}

/** GET /api/posts?q=&tag=&category=&page=&limit=&sort=new|top|hot */
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const q     = (req.query.q || '').trim();
    const tag   = (req.query.tag || '').trim().toLowerCase();
    const category = (req.query.category || '').trim();
    const sort  = (req.query.sort || 'new');

    const filter = {};

    // === OR search: พิมพ์คำใดคำหนึ่งก็เจอ ===
    if (q) {
      const tokens = q
        .replace(/[^\p{L}\p{N}\s#]+/gu, ' ')
        .split(/\s+/)
        .map(t => t.trim())
        .filter(Boolean)
        .map(escapeRx);

      if (tokens.length) {
        const orPattern = tokens.join('|'); // เช่น "ปลูก|สลัด|ไฮโดร"
        filter.$or = [
          { title: { $regex: orPattern, $options: 'i' } },
          { body:  { $regex: orPattern, $options: 'i' } },
          { tags:  { $elemMatch: { $regex: orPattern, $options: 'i' } } },
        ];
      }
    }

    if (tag) filter.tags = tag;
    if (category) filter.category = category;

    let sortObj = { createdAt: -1 };
    if (sort === 'top') sortObj = { likes: -1, createdAt: -1 };
    if (sort === 'hot') sortObj = { views: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      Post.find(filter)
        .select('-comments')
        .populate('author', 'name email')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({
      items,
      categories: SALAD_CATEGORIES,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/posts] error:', err);
    res.status(500).json({ message: 'โหลดกระทู้ไม่สำเร็จ' });
  }
});

/** GET /api/posts/:id   (ไม่เพิ่มวิว) */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const post = await Post.findById(id)
      .populate('author', 'name email')
      .populate('comments.author', 'name email')
      .lean();

    // ✅ ถ้าไม่เจอโพสต์ ให้ตรวจใน DeletedPosts เพื่อบอกว่าโดนแอดมินลบแล้ว
    if (!post) {
      const log = await DeletedPost.findOne({ postId: id }).lean();
      if (log) {
        return res.status(410).json({ message: 'กระทู้นี้ถูกผู้ดูแลระบบลบแล้ว' }); // Gone
      }
      return res.status(404).json({ message: 'ไม่พบกระทู้' });
    }

    // คอมเมนต์ใหม่อยู่บน
    if (Array.isArray(post.comments)) {
      post.comments = post.comments
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.json(post);
  } catch (err) {
    if (err?.name === 'CastError') {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }
    console.error('[GET /api/posts/:id] error:', err);
    return res.status(500).json({ message: 'โหลดกระทู้ไม่สำเร็จ' });
  }
});

/** POST /api/posts/:id/view   (เพิ่มวิว +1) */
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const updated = await Post.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true, select: 'views' }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'ไม่พบกระทู้' });
    return res.json({ views: updated.views });
  } catch (err) {
    console.error('[POST /api/posts/:id/view] error:', err);
    return res.status(500).json({ message: 'อัปเดตยอดวิวไม่สำเร็จ' });
  }
});

/** POST /api/posts/:id/comments   (เพิ่มคอมเมนต์ – ต้องล็อกอิน) */
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const { body } = req.body || {};
    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: 'กรอกคอมเมนต์' });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'ไม่พบกระทู้' });

    post.comments.push({ author: req.user.id, body: String(body).trim() });
    await post.save();

    const populated = await Post.findById(post._id)
      .populate('author', 'name email')
      .populate('comments.author', 'name email');

    if (Array.isArray(populated.comments)) {
      populated.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.status(201).json(populated);
  } catch (err) {
    console.error('[POST /api/posts/:id/comments] error:', err);
    return res.status(500).json({ message: 'แสดงความคิดเห็นไม่สำเร็จ' });
  }
});

/** POST /api/posts (เฉพาะผู้ล็อกอิน) */
router.post('/', auth, async (req, res) => {
  try {
    const { title, body, category, tags, images } = req.body || {};
    if (!title || !body || !category) {
      return res.status(400).json({ message: 'กรุณากรอกหัวข้อ เนื้อหา และหมวด' });
    }

    const rawTags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',') : []);
    const cleanTags = rawTags
      .flat()
      .map(t => String(t).replace(/^#/, '').trim().toLowerCase())
      .filter(Boolean);

    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

    if (Array.isArray(images)) {
      for (const img of images) {

        if (typeof img === "string" && img.startsWith("data:image")) {

          const base64 = img.split(",")[1];
          const size = Buffer.from(base64, "base64").length;

          if (size > MAX_IMAGE_SIZE) {
            return res.status(400).json({
              message: "รูปภาพต้องไม่เกิน 2MB"
            });
          }

        }

      }
    }
    const created = await Post.create({
      title: String(title).trim(),
      body: String(body).trim(),
      category: String(category).trim(),
      tags: cleanTags,
      images: Array.isArray(images) ? images : [],
      author: req.user.id,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('[POST /api/posts] error:', err);
    res.status(500).json({ message: 'สร้างกระทู้ไม่สำเร็จ' });
  }
});

/** PUT /api/posts/:id (แก้ไขได้เฉพาะเจ้าของหรือแอดมิน) */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'ไม่พบกระทู้' });
    if (String(post.author) !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไข' });
    }

    const { title, body, category, tags, images, isPinned } = req.body || {};
    if (title !== undefined) post.title = String(title);
    if (body  !== undefined) post.body  = String(body);
    if (category !== undefined) post.category = String(category);
    if (tags !== undefined) {
      const raw = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',') : []);
      post.tags = raw.flat().map(t => String(t).replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
    }
    if (images !== undefined) post.images = Array.isArray(images) ? images : [];
    if (typeof isPinned === 'boolean') post.isPinned = isPinned;

    await post.save();
    res.json(post);
  } catch (err) {
    console.error('[PUT /api/posts/:id] error:', err);
    res.status(500).json({ message: 'แก้ไขกระทู้ไม่สำเร็จ' });
  }
});

/** DELETE /api/posts/:id (เฉพาะเจ้าของ) */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'ไม่พบกระทู้' });
    if (String(post.author) !== req.user.id) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' });
    }

    await post.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/posts/:id] error:', err);
    res.status(500).json({ message: 'ลบกระทู้ไม่สำเร็จ' });
  }
});

/* ===========================
   รายงาน / ยกเลิกรายงานคอมเมนต์
   =========================== */

/** POST /api/posts/:postId/comments/:commentId/report */
router.post('/:postId/comments/:commentId/report', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    if (!isValidId(postId) || !isValidId(commentId)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    // รับได้ทั้ง code และ label ไทย แล้ว normalize เป็น code
    const reasonCode = normalizeReason(req.body?.reason);
    const note = (req.body?.note || '').toString().trim().slice(0, 500);

    const post = await Post.findOne({ _id: postId, 'comments._id': commentId });
    if (!post) return res.status(404).json({ message: 'ไม่พบคอมเมนต์' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'ไม่พบคอมเมนต์' });

    // 🚫 ห้ามรายงานคอมเมนต์ของตัวเอง
    if (String(comment.author) === req.user.id) {
      return res.status(400).json({ message: 'ไม่สามารถรายงานคอมเมนต์ของตัวเองได้' });
    }

    comment.reports = comment.reports || [];
    const me = String(req.user.id);
    const idx = comment.reports.findIndex(r => String(r.reporter) === me);

    const payload = {
      reporter: req.user.id,
      reason: reasonCode,   // เก็บเป็น code มาตรฐาน
      note,
      createdAt: new Date(),
    };

    if (idx >= 0) comment.reports[idx] = payload; // เคยรายงานแล้ว -> อัปเดต
    else comment.reports.push(payload);

    await post.save();
    return res.status(201).json({ ok: true, count: comment.reports.length });
  } catch (err) {
    console.error('[POST /api/posts/:postId/comments/:commentId/report] error:', err);
    res.status(500).json({ message: 'รายงานคอมเมนต์ไม่สำเร็จ' });
  }
});

/** DELETE /api/posts/:postId/comments/:commentId/report */
router.delete('/:postId/comments/:commentId/report', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    if (!isValidId(postId) || !isValidId(commentId)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const post = await Post.findOne({ _id: postId, 'comments._id': commentId });
    if (!post) return res.status(404).json({ message: 'ไม่พบคอมเมนต์' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'ไม่พบคอมเมนต์' });

    const before = (comment.reports || []).length;
    comment.reports = (comment.reports || []).filter(r => String(r.reporter) !== String(req.user.id));
    const after = comment.reports.length;

    if (after === before) {
      return res.status(200).json({ ok: true, removed: 0, count: after });
    }

    await post.save();
    return res.json({ ok: true, removed: before - after, count: after });
  } catch (err) {
    console.error('[DELETE /api/posts/:postId/comments/:commentId/report] error:', err);
    res.status(500).json({ message: 'ยกเลิกรายงานไม่สำเร็จ' });
  }
});

/** POST /api/posts/:id/like (toggle) */
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'รูปแบบรหัสไม่ถูกต้อง' });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'ไม่พบกระทู้' });

    const uid = req.user.id;
    const i = post.likes.findIndex(v => String(v) === uid);
    if (i >= 0) post.likes.splice(i, 1); else post.likes.push(uid);

    await post.save();
    res.json({ likes: post.likes.length, liked: i < 0 });
  } catch (err) {
    console.error('[POST /api/posts/:id/like] error:', err);
    res.status(500).json({ message: 'กดถูกใจไม่สำเร็จ' });
  }
});

export default router;
