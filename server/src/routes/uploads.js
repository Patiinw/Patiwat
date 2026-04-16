// server/src/routes/uploads.js
import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { Readable } from 'stream';
import { auth } from '../middleware/auth.js';
const router = Router();

/**
 * Multer (memory storage): รับไฟล์เข้า Buffer แล้วสตรีมเข้า GridFS เอง
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB/ไฟล์
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (png, jpg, jpeg, webp, gif)'));
  },
});

// helper: ต้องให้ DB พร้อมก่อนทำงาน
function ensureDbReady(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({ message: 'ฐานข้อมูลยังไม่พร้อม' });
  return false;
}

/* =========================
   POST /api/uploads/images
   (auth ถูกใส่ไว้ใน index.js แล้ว)
   ========================= */
router.post('/images', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
    if (!ensureDbReady(res)) return;

    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });

    const original = req.file.originalname || 'image';
    const ext = (original.split('.').pop() || 'bin').toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: {
        owner: req.user?.id || null,
        originalName: original,
        mimetype: req.file.mimetype,
      },
    });

    await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve);
    });

    return res.status(201).json({
      imageId: uploadStream.id,
      url: `/api/uploads/images/${uploadStream.id}`,
      filename: uploadStream.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      createdAt: uploadStream.uploadDate || new Date(),
    });
  } catch (err) {
    console.error('[UPLOAD IMAGE] error:', err);
    return res.status(400).json({ message: err.message || 'อัปโหลดไม่สำเร็จ' });
  }
});

/* =========================
   GET /api/uploads/images/:id
   ========================= */
router.get('/images/:id', async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'รหัสรูปไม่ถูกต้อง' });
    }

    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
    const fileId = new mongoose.Types.ObjectId(id);

    const file = await db.collection('images.files').findOne({ _id: fileId });
    if (!file) return res.status(404).json({ message: 'ไม่พบรูปภาพ' });

    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.set('Cache-Control', 'public, max-age=3600');

    const stream = bucket.openDownloadStream(fileId);
    stream.on('error', () => res.status(404).end());
    stream.pipe(res);
  } catch (err) {
    console.error('[GET IMAGE] error:', err);
    return res.status(500).json({ message: 'ไม่สามารถอ่านรูปภาพได้' });
  }
});

/* =========================
   DELETE /api/uploads/images/:id
   ========================= */
router.delete('/images/:id', auth, async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'รหัสรูปไม่ถูกต้อง' });
    }

    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
    const fileId = new mongoose.Types.ObjectId(id);

    await bucket.delete(fileId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE IMAGE] error:', err);
    return res.status(400).json({ message: 'ลบรูปไม่สำเร็จ' });
  }
});

/* =========================
   GET /api/uploads/avatar/:id
   (เสิร์ฟ avatar จาก GridFS - bucket: "avatars")
   ========================= */
router.get('/avatar/:id', async (req, res) => {
  try {
    if (!ensureDbReady(res)) return;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'รหัสรูปไม่ถูกต้อง' });
    }

    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'avatars' });
    const fileId = new mongoose.Types.ObjectId(id);

    const file = await db.collection('avatars.files').findOne({ _id: fileId });
    if (!file) return res.status(404).json({ message: 'ไม่พบรูปภาพ' });

    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.set('Cache-Control', 'public, max-age=3600');

    const stream = bucket.openDownloadStream(fileId);
    stream.on('error', () => res.status(404).end());
    stream.pipe(res);
  } catch (err) {
    console.error('[GET AVATAR] error:', err);
    return res.status(500).json({ message: 'ไม่สามารถอ่านรูปภาพได้' });
  }
});

/* =========================
   Multer error handler
   ========================= */
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'อัปโหลดไม่สำเร็จ' });
  }
  return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
});

export default router;
